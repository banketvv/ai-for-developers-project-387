from datetime import datetime, timedelta
from typing import Any, cast

from sqlalchemy import select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.errors import AppError, not_found
from app.db.models import UPCOMING_BOOKING_STATUSES, Booking, MeetingType
from app.schemas.booking import (
    BookingCreate,
    BookingMeetingTypeRead,
    BookingRead,
    BookingStatus,
)
from app.schemas.meeting_type import DurationMinutes
from app.services.meeting_types import upcoming_intervals
from app.services.session import Viewer, normalize_email
from app.services.slots import overlaps, slot_grid


def to_read(booking: Booking, meeting_type: MeetingType) -> BookingRead:
    """Собирает ответ по брони: длительность берётся у типа встречи."""
    return BookingRead(
        id=booking.id,
        start=booking.start,
        guest_name=booking.guest_name,
        guest_email=booking.guest_email,
        created_at=booking.created_at,
        status=cast(BookingStatus, booking.status),
        meeting_type=BookingMeetingTypeRead(
            id=meeting_type.id,
            title=meeting_type.title,
            duration_minutes=cast(DurationMinutes, meeting_type.duration_minutes),
        ),
    )


def _booking_not_found() -> AppError:
    """Бронь, которую смотрящему нельзя показать, ничем не отличается от несуществующей."""
    return not_found("Бронь не найдена")


def _invalid_status() -> AppError:
    """Решение по уже обработанной брони недопустимо: повтор идёт тем же кодом."""
    return AppError(code="invalid_status", message="Бронь уже обработана", status_code=409)


def _booking_in_past() -> AppError:
    """Прошедшую встречу нельзя ни подтвердить, ни отклонить."""
    return AppError(code="booking_in_past", message="Встреча уже прошла", status_code=409)


def _is_slot_start(
    start: datetime,
    *,
    duration_minutes: int,
    now: datetime,
    timezone: str,
) -> bool:
    """Начало принадлежит текущей сетке типа: клиенту верить нельзя."""
    return any(
        grid_start == start
        for grid_start, _ in slot_grid(duration_minutes, now=now, timezone=timezone)
    )


async def create_booking(
    session: AsyncSession,
    *,
    payload: BookingCreate,
    now: datetime,
    timezone: str,
) -> BookingRead:
    """Создаёт бронь по правилам: одна на тип, свободный слот, одна транзакция."""
    meeting_type = await session.get(MeetingType, payload.meeting_type_id)
    if meeting_type is None:
        raise not_found("Тип встречи не найден")

    if not _is_slot_start(
        payload.start,
        duration_minutes=meeting_type.duration_minutes,
        now=now,
        timezone=timezone,
    ):
        raise AppError(
            code="validation_error",
            message="Проверьте заполнение полей",
            status_code=422,
            fields={"start": "Это время недоступно для записи"},
        )

    email = normalize_email(payload.guest_email)
    # Причина «уже есть бронь» не зависит от гонки за слот, поэтому проверяется раньше.
    already_booked = await session.scalar(
        select(Booking.id)
        .where(
            Booking.meeting_type_id == meeting_type.id,
            Booking.guest_email == email,
            Booking.start > now,
            Booking.status.in_(UPCOMING_BOOKING_STATUSES),
        )
        .limit(1)
    )
    if already_booked is not None:
        raise AppError(
            code="already_booked",
            message="У вас уже есть предстоящая бронь на этот тип",
            status_code=409,
        )

    step = timedelta(minutes=meeting_type.duration_minutes)
    busy = await upcoming_intervals(session, now)
    if overlaps(payload.start, payload.start + step, busy):
        raise AppError(code="slot_taken", message="Это время уже занято", status_code=409)

    booking = Booking(
        meeting_type_id=meeting_type.id,
        guest_name=payload.guest_name,
        guest_email=email,
        start=payload.start,
        created_at=now,
        status="pending",
    )
    session.add(booking)
    try:
        await session.commit()
    except IntegrityError:
        # Гонку за слот разрешает UNIQUE(meeting_type_id, start): проигравший получает отказ.
        await session.rollback()
        raise AppError(
            code="slot_taken", message="Это время уже занято", status_code=409
        ) from None
    return to_read(booking, meeting_type)


async def list_bookings(
    session: AsyncSession,
    *,
    viewer: Viewer,
    now: datetime,
) -> list[BookingRead]:
    """Предстоящие брони: гость видит свои, владелец — все; без cookie список пуст."""
    query = (
        select(Booking)
        .options(joinedload(Booking.meeting_type))
        .where(Booking.start > now, Booking.status.in_(UPCOMING_BOOKING_STATUSES))
        .order_by(Booking.start, Booking.id)
    )
    if viewer.is_owner:
        result = await session.execute(query)
    elif viewer.email is not None:
        result = await session.execute(
            query.where(Booking.guest_email == normalize_email(viewer.email))
        )
    else:
        return []
    return [to_read(booking, booking.meeting_type) for booking in result.scalars()]


async def get_booking(
    session: AsyncSession,
    booking_id: int,
    *,
    viewer: Viewer,
) -> BookingRead:
    """Показывает бронь: гость только свою, владелец — любую, остальным 404."""
    result = await session.execute(
        select(Booking).options(joinedload(Booking.meeting_type)).where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise _booking_not_found()
    is_own = viewer.email is not None and normalize_email(viewer.email) == booking.guest_email
    # Отклонённая бронь — история для владельца, но гость её больше не видит.
    if not viewer.is_owner and (booking.status == "rejected" or not is_own):
        raise _booking_not_found()
    return to_read(booking, booking.meeting_type)


async def _decide_booking(
    session: AsyncSession,
    booking_id: int,
    *,
    now: datetime,
    status: BookingStatus,
) -> BookingRead:
    """Переводит ожидающую предстоящую бронь в решение владельца атомарно."""
    # Условие в UPDATE — это и проверка, и защита от гонки: выигрывает ровно одно решение.
    decided = cast(
        CursorResult[Any],
        await session.execute(
            update(Booking)
            .where(
                Booking.id == booking_id,
                Booking.status == "pending",
                Booking.start > now,
            )
            .values(status=status)
        ),
    )
    if decided.rowcount != 1:
        await session.rollback()
        booking = await session.get(Booking, booking_id)
        if booking is None:
            raise _booking_not_found()
        # Порядок важен: обработанная бронь отвечает invalid_status даже если встреча прошла.
        if booking.status != "pending":
            raise _invalid_status()
        raise _booking_in_past()
    await session.commit()
    result = await session.execute(
        select(Booking).options(joinedload(Booking.meeting_type)).where(Booking.id == booking_id)
    )
    booking = result.scalar_one()
    return to_read(booking, booking.meeting_type)


async def approve_booking(
    session: AsyncSession,
    booking_id: int,
    *,
    now: datetime,
) -> BookingRead:
    """Подтверждает ожидающую предстоящую бронь."""
    return await _decide_booking(session, booking_id, now=now, status="approved")


async def reject_booking(
    session: AsyncSession,
    booking_id: int,
    *,
    now: datetime,
) -> BookingRead:
    """Отклоняет ожидающую предстоящую бронь: слот сразу освобождается."""
    return await _decide_booking(session, booking_id, now=now, status="rejected")

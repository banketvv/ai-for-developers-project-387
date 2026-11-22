from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.meeting_type import MeetingType


class BookingStatus(StrEnum):
    """Статус брони: заявка, подтверждённая встреча или отказ владельца."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    DECLINED = "declined"


# Живые брони занимают слот и участвуют в правилах занятости.
LIVE_BOOKING_STATUSES = (BookingStatus.PENDING.value, BookingStatus.CONFIRMED.value)


class Booking(Base):
    """Бронь: запись гостя на конкретный слот конкретного типа встречи."""

    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'declined')",
            name="status",
        ),
        # Только живые брони делят слот: отклонённая не мешает записаться снова.
        Index(
            "uq_bookings_meeting_type_start_live",
            "meeting_type_id",
            "start",
            unique=True,
            sqlite_where=text("status IN ('pending', 'confirmed')"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meeting_type_id: Mapped[int] = mapped_column(
        ForeignKey("meeting_types.id", ondelete="CASCADE"),
        index=True,
    )
    guest_name: Mapped[str] = mapped_column(String(100))
    guest_email: Mapped[str] = mapped_column(String(320))
    start: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(
        String(16),
        default=BookingStatus.PENDING.value,
        server_default=BookingStatus.PENDING.value,
    )

    meeting_type: Mapped["MeetingType"] = relationship(back_populates="bookings")

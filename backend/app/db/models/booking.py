from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    text,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# Статусы брони и подмножество, которое удерживает слот: отклонённые не в счёт.
BOOKING_STATUSES = ("pending", "approved", "rejected")
UPCOMING_BOOKING_STATUSES = ("pending", "approved")

if TYPE_CHECKING:
    from app.db.models.meeting_type import MeetingType


class Booking(Base):
    """Бронь: запись гостя на конкретный слот конкретного типа встречи."""

    __tablename__ = "bookings"
    __table_args__ = (
        # Отклонённая бронь слот не держит: индекс не учитывает статус `rejected`.
        Index(
            "uq_bookings_meeting_type_start_not_rejected",
            "meeting_type_id",
            "start",
            unique=True,
            sqlite_where=text("status != 'rejected'"),
        ),
        # Один слот одного типа — одна бронь: гонку за слот разрешает БД.
        UniqueConstraint("meeting_type_id", "start", name="uq_bookings_meeting_type_start"),
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected')",
            name="ck_bookings_status",
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
    status: Mapped[str] = mapped_column(String(20), default="pending")

    meeting_type: Mapped["MeetingType"] = relationship(back_populates="bookings")

"""add booking status and live-slot uniqueness

Revision ID: 20261122_0002
Revises: 20261113_0001
Create Date: 2026-11-22 00:00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261122_0002"
down_revision: str | None = "20261113_0001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Добавляет статус, переносит существующие брони в confirmed и ослабляет UNIQUE."""
    with op.batch_alter_table("bookings") as batch:
        batch.add_column(sa.Column("status", sa.String(length=16), nullable=True))

    # До появления статусов любая бронь считалась состоявшейся.
    op.execute("UPDATE bookings SET status = 'confirmed' WHERE status IS NULL")

    with op.batch_alter_table("bookings") as batch:
        batch.alter_column(
            "status",
            existing_type=sa.String(length=16),
            nullable=False,
            server_default="pending",
        )
        batch.drop_constraint("uq_bookings_meeting_type_start", type_="unique")
        batch.create_check_constraint(
            "ck_bookings_status",
            "status IN ('pending', 'confirmed', 'declined')",
        )

    # Отклонённая бронь не должна мешать записаться на тот же слот снова.
    op.create_index(
        "uq_bookings_meeting_type_start_live",
        "bookings",
        ["meeting_type_id", "start"],
        unique=True,
        sqlite_where=sa.text("status IN ('pending', 'confirmed')"),
    )


def downgrade() -> None:
    """Возвращает безусловную уникальность слота и убирает статус."""
    op.drop_index("uq_bookings_meeting_type_start_live", table_name="bookings")
    # Старая схема не умеет хранить отказ: без этой чистки UNIQUE не восстановится.
    op.execute("DELETE FROM bookings WHERE status = 'declined'")
    with op.batch_alter_table("bookings") as batch:
        batch.drop_constraint("ck_bookings_status", type_="check")
        batch.create_unique_constraint(
            "uq_bookings_meeting_type_start",
            ["meeting_type_id", "start"],
        )
        batch.drop_column("status")

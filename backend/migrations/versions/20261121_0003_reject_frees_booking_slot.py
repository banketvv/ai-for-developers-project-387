"""replace slot uniqueness with a partial index that ignores rejected bookings

Revision ID: 20261121_0003
Revises: 20261121_0002
Create Date: 2026-11-21 00:00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261121_0003"
down_revision: str | None = "20261121_0002"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

NOT_REJECTED = "status != 'rejected'"


def upgrade() -> None:
    """Освобождает слот отклонённой брони: индекс не учитывает статус `rejected`."""
    with op.batch_alter_table("bookings") as batch_op:
        batch_op.drop_constraint("uq_bookings_meeting_type_start", type_="unique")
        batch_op.create_index(
            "uq_bookings_meeting_type_start_not_rejected",
            ["meeting_type_id", "start"],
            unique=True,
            sqlite_where=sa.text(NOT_REJECTED),
        )


def downgrade() -> None:
    """Возвращает строгую уникальность, убирая отклонённые брони с освобождённых слотов."""
    # Старая схема не умеет хранить отказ и запрещает дубли «тип + начало»,
    # поэтому история отклонённых броней при откате удаляется.
    op.execute("DELETE FROM bookings WHERE status = 'rejected'")
    with op.batch_alter_table("bookings") as batch_op:
        batch_op.drop_index("uq_bookings_meeting_type_start_not_rejected")
        batch_op.create_unique_constraint(
            "uq_bookings_meeting_type_start",
            ["meeting_type_id", "start"],
        )

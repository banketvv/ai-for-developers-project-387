"""add booking status

Revision ID: 20261121_0002
Revises: 20261113_0001
Create Date: 2026-11-21 00:00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261121_0002"
down_revision: str | None = "20261113_0001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Добавляет статус брони: новые записи ждут подтверждения, старые уже подтверждены."""
    with op.batch_alter_table("bookings") as batch_op:
        batch_op.add_column(
            sa.Column(
                "status",
                sa.String(length=20),
                nullable=False,
                server_default="pending",
            )
        )
        batch_op.create_check_constraint(
            "ck_bookings_status",
            "status IN ('pending', 'approved', 'rejected')",
        )
    # Брони, созданные до появления статуса, считаются подтверждёнными.
    op.execute("UPDATE bookings SET status = 'approved'")


def downgrade() -> None:
    """Возвращает схему без статуса: колонка и её ограничение удаляются."""
    with op.batch_alter_table("bookings") as batch_op:
        batch_op.drop_constraint("ck_bookings_status", type_="check")
        batch_op.drop_column("status")

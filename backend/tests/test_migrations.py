import sqlite3
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config

BACKEND_DIR = Path(__file__).resolve().parents[1]


def alembic_config(path: Path) -> Config:
    """Собирает конфиг Alembic для временной базы."""
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    config.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{path.as_posix()}")
    return config


def upgrade_to(path: Path, revision: str) -> None:
    """Прогоняет миграции Alembic на временной базе до указанной ревизии."""
    command.upgrade(alembic_config(path), revision)


def upgrade_to_head(path: Path) -> None:
    """Прогоняет миграции Alembic на временной базе до последней ревизии."""
    upgrade_to(path, "head")


def test_migration_creates_both_tables_and_enforces_durations(tmp_path: Path) -> None:
    path = tmp_path / "migrated.db"

    upgrade_to_head(path)

    with sqlite3.connect(path) as connection:
        tables = {
            row[0]
            for row in connection.execute("select name from sqlite_master where type = 'table'")
        }
        assert {"meeting_types", "bookings"} <= tables
        table_sql = connection.execute(
            "select sql from sqlite_master where type = 'table' and name = 'meeting_types'"
        ).fetchone()[0]
        assert "CHECK" in table_sql.upper()
        with pytest.raises(sqlite3.IntegrityError):
            connection.execute(
                "insert into meeting_types (title, duration_minutes, created_at) "
                "values ('Тип', 20, '2026-11-16 09:00:00')"
            )


def test_migration_cascades_bookings_with_their_type(tmp_path: Path) -> None:
    path = tmp_path / "migrated.db"
    upgrade_to_head(path)

    with sqlite3.connect(path) as connection:
        connection.execute("pragma foreign_keys=on")
        connection.execute(
            "insert into meeting_types (id, title, duration_minutes, created_at) "
            "values (1, 'Тип', 30, '2026-11-16 09:00:00')"
        )
        connection.execute(
            "insert into bookings "
            "(meeting_type_id, guest_name, guest_email, start, created_at) "
            "values (1, 'Гость', 'guest@example.com', '2026-11-16 09:00:00', "
            "'2026-11-16 08:00:00')"
        )

        connection.execute("delete from meeting_types where id = 1")

        assert connection.execute("select count(*) from bookings").fetchone()[0] == 0


def test_migration_backfills_existing_bookings_as_confirmed(tmp_path: Path) -> None:
    path = tmp_path / "migrated.db"
    upgrade_to(path, "20261113_0001")

    with sqlite3.connect(path) as connection:
        connection.execute(
            "insert into meeting_types (id, title, duration_minutes, created_at) "
            "values (1, 'Тип', 30, '2026-11-16 09:00:00')"
        )
        connection.execute(
            "insert into bookings "
            "(meeting_type_id, guest_name, guest_email, start, created_at) "
            "values (1, 'Гость', 'guest@example.com', '2026-11-16 10:00:00', "
            "'2026-11-16 09:00:00')"
        )

    upgrade_to_head(path)

    with sqlite3.connect(path) as connection:
        assert connection.execute("select status from bookings").fetchone()[0] == "confirmed"


def test_migration_lets_a_declined_booking_free_its_slot(tmp_path: Path) -> None:
    path = tmp_path / "migrated.db"
    upgrade_to_head(path)

    with sqlite3.connect(path) as connection:
        connection.execute(
            "insert into meeting_types (id, title, duration_minutes, created_at) "
            "values (1, 'Тип', 30, '2026-11-16 09:00:00')"
        )
        connection.execute(
            "insert into bookings "
            "(meeting_type_id, guest_name, guest_email, start, created_at, status) "
            "values (1, 'Гость', 'first@example.com', '2026-11-16 10:00:00', "
            "'2026-11-16 09:00:00', 'declined')"
        )
        connection.execute(
            "insert into bookings "
            "(meeting_type_id, guest_name, guest_email, start, created_at, status) "
            "values (1, 'Другой', 'second@example.com', '2026-11-16 10:00:00', "
            "'2026-11-16 09:00:00', 'pending')"
        )
        with pytest.raises(sqlite3.IntegrityError):
            connection.execute(
                "insert into bookings "
                "(meeting_type_id, guest_name, guest_email, start, created_at, status) "
                "values (1, 'Третий', 'third@example.com', '2026-11-16 10:00:00', "
                "'2026-11-16 09:00:00', 'confirmed')"
            )
        with pytest.raises(sqlite3.IntegrityError):
            connection.execute(
                "insert into bookings "
                "(meeting_type_id, guest_name, guest_email, start, created_at, status) "
                "values (1, 'Четвёртый', 'fourth@example.com', '2026-11-16 11:00:00', "
                "'2026-11-16 09:00:00', 'unknown')"
            )


def downgrade_to(path: Path, revision: str) -> None:
    """Откатывает миграции Alembic на временной базе до указанной ревизии."""
    command.downgrade(alembic_config(path), revision)


def test_migration_downgrade_drops_declined_and_restores_unique(tmp_path: Path) -> None:
    path = tmp_path / "migrated.db"
    upgrade_to_head(path)

    with sqlite3.connect(path) as connection:
        connection.execute(
            "insert into meeting_types (id, title, duration_minutes, created_at) "
            "values (1, 'Тип', 30, '2026-11-16 09:00:00')"
        )
        for email, status in (("guest@example.com", "declined"), ("other@example.com", "pending")):
            connection.execute(
                "insert into bookings "
                "(meeting_type_id, guest_name, guest_email, start, created_at, status) "
                "values (1, 'Гость', ?, '2026-11-16 10:00:00', "
                "'2026-11-16 09:00:00', ?)",
                (email, status),
            )

    downgrade_to(path, "20261113_0001")

    with sqlite3.connect(path) as connection:
        assert connection.execute("select count(*) from bookings").fetchone()[0] == 1
        with pytest.raises(sqlite3.IntegrityError):
            connection.execute(
                "insert into bookings "
                "(meeting_type_id, guest_name, guest_email, start, created_at) "
                "values (1, 'Другой', 'third@example.com', '2026-11-16 10:00:00', "
                "'2026-11-16 09:00:00')"
            )

import sqlite3
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config

BACKEND_DIR = Path(__file__).resolve().parents[1]


def alembic_config(path: Path) -> Config:
    """Настройки Alembic на временной базе."""
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    config.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{path.as_posix()}")
    return config


def upgrade_to_head(path: Path) -> None:
    """Прогоняет миграции Alembic на временной базе."""
    command.upgrade(alembic_config(path), "head")


def booking_columns(path: Path) -> set[str]:
    """Имена колонок таблицы броней после миграции."""
    with sqlite3.connect(path) as connection:
        return {row[1] for row in connection.execute("pragma table_info(bookings)")}


def statuses(path: Path) -> list[str]:
    """Статусы всех броней в порядке вставки."""
    with sqlite3.connect(path) as connection:
        return [row[0] for row in connection.execute("select status from bookings order by id")]


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


def test_status_migration_keeps_history_approved_and_new_rows_pending(tmp_path: Path) -> None:
    path = tmp_path / "migrated.db"
    config = alembic_config(path)

    # Базовую схему наполняем до появления статуса: так выглядит боевая база.
    command.upgrade(config, "20261113_0001")
    with sqlite3.connect(path) as connection:
        connection.execute(
            "insert into meeting_types (id, title, duration_minutes, created_at) "
            "values (1, 'Тип', 30, '2026-11-16 09:00:00')"
        )
        connection.execute(
            "insert into bookings "
            "(meeting_type_id, guest_name, guest_email, start, created_at) "
            "values (1, 'Гость', 'guest@example.com', '2026-11-16 10:00:00', "
            "'2026-11-16 08:00:00')"
        )

    command.upgrade(config, "head")

    assert "status" in booking_columns(path)
    assert statuses(path) == ["approved"]
    table_sql = ""
    with sqlite3.connect(path) as connection:
        table_sql = connection.execute(
            "select sql from sqlite_master where type = 'table' and name = 'bookings'"
        ).fetchone()[0]
        connection.execute(
            "insert into bookings "
            "(meeting_type_id, guest_name, guest_email, start, created_at) "
            "values (1, 'Новый', 'new@example.com', '2026-11-16 11:00:00', "
            "'2026-11-16 08:00:00')"
        )
        with pytest.raises(sqlite3.IntegrityError):
            connection.execute(
                "insert into bookings "
                "(meeting_type_id, guest_name, guest_email, start, created_at, status) "
                "values (1, 'Сломанный', 'broken@example.com', '2026-11-16 12:00:00', "
                "'2026-11-16 08:00:00', 'unknown')"
            )

    assert "CHECK" in table_sql.upper()
    assert statuses(path) == ["approved", "pending"]


def test_status_migration_downgrade_restores_the_previous_schema(tmp_path: Path) -> None:
    path = tmp_path / "migrated.db"
    upgrade_to_head(path)

    command.downgrade(alembic_config(path), "20261113_0001")

    assert "status" not in booking_columns(path)
    with sqlite3.connect(path) as connection:
        table_sql = connection.execute(
            "select sql from sqlite_master where type = 'table' and name = 'bookings'"
        ).fetchone()[0]
    assert "status" not in table_sql
    assert "uq_bookings_meeting_type_start" in table_sql


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


def insert_booking(
    connection: sqlite3.Connection,
    *,
    booking_id: int,
    status: str,
) -> None:
    """Кладёт бронь на один и тот же слот: проверяем уникальность по статусу."""
    connection.execute(
        "insert into bookings "
        "(id, meeting_type_id, guest_name, guest_email, start, created_at, status) "
        "values (?, 1, 'Гость', 'guest@example.com', '2026-11-16 10:00:00', "
        "'2026-11-16 08:00:00', ?)",
        (booking_id, status),
    )


def test_rejected_booking_frees_the_slot_unique_index(tmp_path: Path) -> None:
    path = tmp_path / "migrated.db"
    upgrade_to_head(path)

    with sqlite3.connect(path) as connection:
        connection.execute(
            "insert into meeting_types (id, title, duration_minutes, created_at) "
            "values (1, 'Тип', 30, '2026-11-16 09:00:00')"
        )
        # Отклонённая бронь не держит слот: тот же слот занимает предстоящая.
        insert_booking(connection, booking_id=1, status="rejected")
        insert_booking(connection, booking_id=2, status="pending")
        # Дубли среди предстоящих по-прежнему запрещены.
        with pytest.raises(sqlite3.IntegrityError):
            insert_booking(connection, booking_id=3, status="approved")

        index_sql = connection.execute(
            "select sql from sqlite_master "
            "where type = 'index' and name = 'uq_bookings_meeting_type_start_not_rejected'"
        ).fetchone()[0]
        table_sql = connection.execute(
            "select sql from sqlite_master where type = 'table' and name = 'bookings'"
        ).fetchone()[0]

    assert "WHERE status != 'rejected'" in index_sql
    # Перестройка таблицы не теряет CHECK-ограничение статуса.
    assert "CHECK" in table_sql.upper()


def test_unique_index_downgrade_restores_strict_slot_uniqueness(tmp_path: Path) -> None:
    path = tmp_path / "migrated.db"
    upgrade_to_head(path)

    command.downgrade(alembic_config(path), "20261121_0002")

    with sqlite3.connect(path) as connection:
        connection.execute(
            "insert into meeting_types (id, title, duration_minutes, created_at) "
            "values (1, 'Тип', 30, '2026-11-16 09:00:00')"
        )
        insert_booking(connection, booking_id=1, status="rejected")
        with pytest.raises(sqlite3.IntegrityError):
            insert_booking(connection, booking_id=2, status="pending")


def test_unique_index_downgrade_removes_rejected_rows_with_duplicates(
    tmp_path: Path,
) -> None:
    path = tmp_path / "migrated.db"
    upgrade_to_head(path)

    with sqlite3.connect(path) as connection:
        connection.execute(
            "insert into meeting_types (id, title, duration_minutes, created_at) "
            "values (1, 'Тип', 30, '2026-11-16 09:00:00')"
        )
        insert_booking(connection, booking_id=1, status="rejected")
        insert_booking(connection, booking_id=2, status="pending")

    # Старая схема не умеет хранить отказ: история отклонённой брони удаляется.
    command.downgrade(alembic_config(path), "20261121_0002")

    assert statuses(path) == ["pending"]

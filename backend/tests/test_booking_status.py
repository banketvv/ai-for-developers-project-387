from fastapi.testclient import TestClient

from app.core.config import Settings
from tests.support import FIRST_SLOT, booking_payload, create_meeting_type


def test_new_booking_is_pending_and_visible_with_its_status(
    client: TestClient, settings: Settings
) -> None:
    meeting_type = create_meeting_type(client, settings, title="Консультация", duration_minutes=60)
    client.cookies.clear()

    created = client.post("/api/v1/bookings", json=booking_payload(meeting_type["id"]))

    assert created.status_code == 201
    assert created.json()["status"] == "pending"
    booking_id = created.json()["id"]
    assert client.get(f"/api/v1/bookings/{booking_id}").json()["status"] == "pending"
    assert client.get("/api/v1/bookings").json()[0]["status"] == "pending"

    client.cookies.clear()
    client.post("/api/v1/session", json={"email": settings.owner_email})
    assert client.get(f"/api/v1/bookings/{booking_id}").json()["status"] == "pending"


def test_pending_booking_holds_the_slot_for_other_guests_and_types(
    client: TestClient, settings: Settings
) -> None:
    hour_type = create_meeting_type(client, settings, title="Час", duration_minutes=60)
    half_hour_type = create_meeting_type(client, settings, title="Полчаса", duration_minutes=30)
    client.cookies.clear()
    assert (
        client.post(
            "/api/v1/bookings",
            json=booking_payload(hour_type["id"], guest_email="first@example.com"),
        ).status_code
        == 201
    )

    same_slot = client.post(
        "/api/v1/bookings",
        json=booking_payload(hour_type["id"], guest_email="second@example.com"),
    )
    other_type_overlap = client.post(
        "/api/v1/bookings",
        json=booking_payload(
            half_hour_type["id"],
            start="2026-11-16T10:30:00Z",
            guest_email="second@example.com",
        ),
    )

    assert same_slot.status_code == 409
    assert same_slot.json()["error"]["code"] == "slot_taken"
    assert other_type_overlap.status_code == 409
    assert other_type_overlap.json()["error"]["code"] == "slot_taken"


def test_pending_booking_counts_for_the_single_booking_rule(
    client: TestClient, settings: Settings
) -> None:
    meeting_type = create_meeting_type(client, settings, title="Час", duration_minutes=60)
    client.cookies.clear()
    client.post("/api/v1/bookings", json=booking_payload(meeting_type["id"]))

    second = client.post(
        "/api/v1/bookings",
        json=booking_payload(meeting_type["id"], start="2026-11-16T11:00:00Z"),
    )

    assert second.status_code == 409
    assert second.json()["error"]["code"] == "already_booked"


def test_pending_booking_locks_duration_and_marks_the_slot_busy(
    client: TestClient, settings: Settings
) -> None:
    meeting_type = create_meeting_type(client, settings, title="Час", duration_minutes=60)
    client.cookies.clear()
    client.post("/api/v1/bookings", json=booking_payload(meeting_type["id"]))

    detail = client.get(f"/api/v1/meeting-types/{meeting_type['id']}").json()
    slots = {
        slot["start"]: slot["available"]
        for slot in client.get(f"/api/v1/meeting-types/{meeting_type['id']}/slots").json()["slots"]
    }

    assert detail["bookings_count"] == 1
    assert detail["duration_locked"] is True
    assert slots[FIRST_SLOT] is False
    client.cookies.clear()
    client.post("/api/v1/session", json={"email": settings.owner_email})
    locked = client.patch(
        f"/api/v1/meeting-types/{meeting_type['id']}",
        json={"duration_minutes": 30},
    )
    assert locked.status_code == 409
    assert locked.json()["error"]["code"] == "duration_locked"

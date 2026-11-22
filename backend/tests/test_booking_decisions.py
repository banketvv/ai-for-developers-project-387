import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from tests.support import FIRST_SLOT, booking_payload, create_meeting_type


def create_booking(
    client: TestClient,
    settings: Settings,
) -> tuple[dict[str, object], dict[str, object]]:
    """Заводит тип и заявку гостя, оставляя клиент с гостевой cookie."""
    meeting_type = create_meeting_type(
        client,
        settings,
        title="Консультация",
        duration_minutes=60,
    )
    client.cookies.clear()
    response = client.post("/api/v1/bookings", json=booking_payload(meeting_type["id"]))
    assert response.status_code == 201
    return meeting_type, response.json()


def log_in_as_owner(client: TestClient, settings: Settings) -> None:
    """Переключает cookie на владельца."""
    client.cookies.clear()
    client.post("/api/v1/session", json={"email": settings.owner_email})


def test_owner_confirms_a_pending_booking_and_it_stays_in_the_slot(
    client: TestClient, settings: Settings
) -> None:
    meeting_type, booking = create_booking(client, settings)
    log_in_as_owner(client, settings)

    response = client.patch(
        f"/api/v1/bookings/{booking['id']}",
        json={"status": "confirmed"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"
    slots = {
        slot["start"]: slot["available"]
        for slot in client.get(f"/api/v1/meeting-types/{meeting_type['id']}/slots").json()["slots"]
    }
    assert slots[FIRST_SLOT] is False
    detail = client.get(f"/api/v1/meeting-types/{meeting_type['id']}").json()
    assert detail["duration_locked"] is True


def test_owner_declines_a_booking_and_its_slot_becomes_available_again(
    client: TestClient, settings: Settings
) -> None:
    meeting_type, booking = create_booking(client, settings)
    log_in_as_owner(client, settings)

    response = client.patch(
        f"/api/v1/bookings/{booking['id']}",
        json={"status": "declined"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "declined"
    slots = {
        slot["start"]: slot["available"]
        for slot in client.get(f"/api/v1/meeting-types/{meeting_type['id']}/slots").json()["slots"]
    }
    assert slots[FIRST_SLOT] is True
    detail = client.get(f"/api/v1/meeting-types/{meeting_type['id']}").json()
    assert detail["duration_locked"] is False
    # Отклонённая бронь остаётся в общем числе: это предупреждение об удалении.
    assert detail["bookings_count"] == 1


def test_declined_booking_stays_visible_to_the_guest(
    client: TestClient, settings: Settings
) -> None:
    _, booking = create_booking(client, settings)
    log_in_as_owner(client, settings)
    client.patch(f"/api/v1/bookings/{booking['id']}", json={"status": "declined"})

    client.cookies.clear()
    client.cookies.set(settings.session_cookie_name, "guest@example.com")
    listed = client.get("/api/v1/bookings").json()

    assert [(item["id"], item["status"]) for item in listed] == [(booking["id"], "declined")]
    assert client.get(f"/api/v1/bookings/{booking['id']}").json()["status"] == "declined"


def test_guest_can_book_the_same_slot_again_after_a_decline(
    client: TestClient, settings: Settings
) -> None:
    meeting_type, booking = create_booking(client, settings)
    log_in_as_owner(client, settings)
    client.patch(f"/api/v1/bookings/{booking['id']}", json={"status": "declined"})

    client.cookies.clear()
    response = client.post("/api/v1/bookings", json=booking_payload(meeting_type["id"]))

    assert response.status_code == 201
    assert response.json()["status"] == "pending"
    assert response.json()["id"] != booking["id"]


def test_declined_booking_does_not_count_as_the_single_upcoming_booking(
    client: TestClient, settings: Settings
) -> None:
    meeting_type, booking = create_booking(client, settings)
    log_in_as_owner(client, settings)
    client.patch(f"/api/v1/bookings/{booking['id']}", json={"status": "declined"})

    client.cookies.clear()
    response = client.post(
        "/api/v1/bookings",
        json=booking_payload(meeting_type["id"], start="2026-11-16T11:00:00Z"),
    )

    assert response.status_code == 201


def test_guest_cannot_decide_a_booking(client: TestClient, settings: Settings) -> None:
    _, booking = create_booking(client, settings)

    response = client.patch(
        f"/api/v1/bookings/{booking['id']}",
        json={"status": "confirmed"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"
    assert client.get(f"/api/v1/bookings/{booking['id']}").json()["status"] == "pending"


def test_unknown_booking_is_not_found_for_a_decision(
    client: TestClient, settings: Settings
) -> None:
    log_in_as_owner(client, settings)

    response = client.patch("/api/v1/bookings/999", json={"status": "confirmed"})

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


@pytest.mark.parametrize("status", ["pending", "approved", ""])
def test_invalid_decision_is_a_validation_error(
    client: TestClient, settings: Settings, status: str
) -> None:
    _, booking = create_booking(client, settings)
    log_in_as_owner(client, settings)

    response = client.patch(f"/api/v1/bookings/{booking['id']}", json={"status": status})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert "status" in response.json()["error"]["fields"]


def test_a_decided_booking_cannot_be_decided_again(client: TestClient, settings: Settings) -> None:
    _, booking = create_booking(client, settings)
    log_in_as_owner(client, settings)
    assert (
        client.patch(f"/api/v1/bookings/{booking['id']}", json={"status": "confirmed"}).status_code
        == 200
    )

    second = client.patch(f"/api/v1/bookings/{booking['id']}", json={"status": "declined"})

    assert second.status_code == 409
    assert second.json()["error"]["code"] == "already_decided"
    assert client.get(f"/api/v1/bookings/{booking['id']}").json()["status"] == "confirmed"

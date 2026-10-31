import contextlib
import io
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.services import extraction_service, prescription_service

AsRole = Callable[[UserRole], tuple[TestClient, User]]

EXTRACTED: dict[str, Any] = {
    "patient": {
        "patient_id": "RR-1042",
        "full_name": "Rahima Begum",
        "age_years": 34,
        "sex": "female",
        "phone": "01712345678",
    },
    "visit_date": "2026-10-08",
    "chief_complaint": "Pain in lower left back tooth",
    "diagnosis": "Irreversible pulpitis 36",
    "procedures": ["RCT 36 - access opening", "  "],
    "medications": [
        {
            "name": "Tab. Napa 500 mg",
            "dosage": "500 mg",
            "frequency": "1+0+1",
            "duration": "5 days",
            "instructions": "after meal",
        },
        {"name": "", "dosage": None, "frequency": None, "duration": None, "instructions": None},
    ],
    "advice": ["Warm saline gargle"],
    "follow_up_date": "2026-10-15",
    "notes": None,
    "uncertain_fields": ["medications.0.duration"],
}


def _photo() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (800, 1100), "white").save(buf, "PNG")
    return buf.getvalue()


@pytest.fixture(autouse=True)
def storage(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    monkeypatch.setattr(prescription_service, "_storage_root", lambda: tmp_path)
    return tmp_path


@pytest.fixture(autouse=True)
def background_session(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    """Background reads use the test's transaction instead of a new session."""
    monkeypatch.setattr(prescription_service, "new_session", lambda: contextlib.nullcontext(db))


@pytest.fixture
def extraction(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """Stub the Gemini call. Set state["error"] to simulate a failed read."""
    state: dict[str, Any] = {"result": EXTRACTED, "error": None, "calls": 0}

    def fake_extract(images: list[bytes], media_type: str = "image/jpeg", today: object = None) -> dict:
        state["calls"] += 1
        state["pages"] = len(images)
        assert all(i[:2] == b"\xff\xd8" for i in images), "photos are re-encoded as JPEG before reading"
        if state["error"]:
            raise extraction_service.ExtractionError(state["error"])
        return state["result"]

    monkeypatch.setattr(extraction_service, "extract", fake_extract)
    return state


def _scan(client: TestClient, pages: int = 1) -> Any:
    return client.post(
        "/api/v1/prescriptions/scan",
        files=[("files", (f"rx-{n}.png", _photo(), "image/png")) for n in range(pages)],
    )


def _scanned(client: TestClient, pages: int = 1) -> Any:
    """Scan, then fetch the draft once the background read has finished."""
    res = _scan(client, pages)
    assert res.status_code == 201, res.text
    assert res.json()["reading"] is True
    return client.get(f"/api/v1/prescriptions/{res.json()['id']}").json()


def _save_body(**overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "new_patient": {
            "patient_code": "RR-1042",
            "full_name": "Rahima Begum",
            "phone": "01712345678",
            "age_years": 34,
            "sex": "female",
        },
        "visit_date": "2026-10-08",
        "diagnosis": "Irreversible pulpitis 36",
        "procedures": ["RCT 36 - access opening"],
        "medications": [{"name": "Tab. Napa 500 mg", "frequency": "1+0+1", "duration": "5 days"}],
        "advice": ["Warm saline gargle"],
        "follow_up_date": "2026-10-15",
    }
    body.update(overrides)
    return body


def test_assistant_scans_but_only_a_dentist_files(
    as_role: AsRole, extraction: dict[str, Any]
) -> None:
    client, _ = as_role(UserRole.RECEPTIONIST)
    draft = _scan(client)
    assert draft.status_code == 201, draft.text
    draft_id = draft.json()["id"]

    assert client.put(f"/api/v1/prescriptions/{draft_id}", json=_save_body()).status_code == 403
    assert client.post(f"/api/v1/prescriptions/{draft_id}/extract").status_code == 200

    client, _ = as_role(UserRole.DENTIST)
    res = client.put(f"/api/v1/prescriptions/{draft_id}", json=_save_body())
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "confirmed"


def test_assistant_can_discard_drafts_only(as_role: AsRole, extraction: dict[str, Any]) -> None:
    client, _ = as_role(UserRole.RECEPTIONIST)
    draft = _scan(client).json()
    assert client.delete(f"/api/v1/prescriptions/{draft['id']}").status_code == 204

    client, _ = as_role(UserRole.DENTIST)
    filed = _scan(client).json()
    client.put(f"/api/v1/prescriptions/{filed['id']}", json=_save_body())
    client, _ = as_role(UserRole.RECEPTIONIST)
    assert client.delete(f"/api/v1/prescriptions/{filed['id']}").status_code == 403


def test_pages_are_read_together(
    as_role: AsRole, extraction: dict[str, Any], storage: Path
) -> None:
    client, _ = as_role(UserRole.RECEPTIONIST)
    res = _scan(client, pages=3)
    assert res.status_code == 201, res.text
    body = res.json()
    assert extraction["calls"] == 1
    assert extraction["pages"] == 3
    assert len(body["image_urls"]) == 3
    assert len(list((storage / "prescriptions").glob("*.jpg"))) == 3
    assert client.get(body["image_urls"][2]).status_code == 200
    assert client.get(f"/api/v1/prescriptions/{body['id']}/pages/4").status_code == 404

    assert client.delete(f"/api/v1/prescriptions/{body['id']}").status_code == 204
    assert list((storage / "prescriptions").glob("*.jpg")) == []


def test_too_many_pages_are_rejected(as_role: AsRole, extraction: dict[str, Any]) -> None:
    client, _ = as_role(UserRole.RECEPTIONIST)
    res = _scan(client, pages=prescription_service.MAX_PAGES + 1)
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "too_many_pages"
    assert extraction["calls"] == 0


def test_scan_creates_a_cleaned_up_draft(
    as_role: AsRole, extraction: dict[str, Any], storage: Path
) -> None:
    client, _ = as_role(UserRole.DENTIST)
    body = _scanned(client)

    assert body["reading"] is False
    assert body["status"] == "draft"
    assert body["patient"] is None
    assert body["visit_date"] == "2026-10-08"
    assert body["follow_up_date"] == "2026-10-15"
    # Blank entries from the model are dropped.
    assert body["procedures"] == ["RCT 36 - access opening"]
    assert [m["name"] for m in body["medications"]] == ["Tab. Napa 500 mg"]
    assert body["extracted"]["uncertain_fields"] == ["medications.0.duration"]
    assert len(list((storage / "prescriptions").glob("*.jpg"))) == 1

    image = client.get(body["image_urls"][0])
    assert image.status_code == 200
    assert image.headers["content-type"] == "image/jpeg"


def test_failed_read_still_keeps_the_photo(as_role: AsRole, extraction: dict[str, Any]) -> None:
    client, _ = as_role(UserRole.DENTIST)
    extraction["error"] = "No API key"
    draft = _scanned(client)

    assert draft["extraction_error"] == "No API key"
    assert draft["medications"] == []

    extraction["error"] = None
    again = client.post(f"/api/v1/prescriptions/{draft['id']}/extract")
    assert again.status_code == 200
    assert again.json()["reading"] is True
    after = client.get(f"/api/v1/prescriptions/{draft['id']}").json()
    assert after["extraction_error"] is None
    assert after["diagnosis"] == "Irreversible pulpitis 36"


def test_non_image_upload_is_rejected(as_role: AsRole, extraction: dict[str, Any]) -> None:
    client, _ = as_role(UserRole.DENTIST)
    res = client.post(
        "/api/v1/prescriptions/scan",
        files=[("files", ("rx.pdf", b"%PDF-1.7 nope", "application/pdf"))],
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "invalid_image"
    assert extraction["calls"] == 0


def test_saving_files_the_prescription_under_a_new_patient(
    as_role: AsRole, extraction: dict[str, Any]
) -> None:
    client, dentist = as_role(UserRole.DENTIST)
    draft = _scan(client).json()

    res = client.put(f"/api/v1/prescriptions/{draft['id']}", json=_save_body())
    assert res.status_code == 200, res.text
    saved = res.json()
    assert saved["status"] == "confirmed"
    assert saved["patient"]["patient_code"] == "RR-1042"
    assert saved["confirmed_by"]["id"] == str(dentist.id)

    patients = client.get("/api/v1/patients", params={"q": "rahima"}).json()
    assert patients["total"] == 1
    patient = patients["items"][0]
    assert patient["phone"] == "+8801712345678"
    assert patient["visit_count"] == 1
    assert patient["last_visit_date"] == "2026-10-08"

    history = client.get("/api/v1/prescriptions", params={"patient_id": patient["id"]}).json()
    assert [p["id"] for p in history["items"]] == [draft["id"]]


def test_next_scan_suggests_the_existing_patient(
    as_role: AsRole, extraction: dict[str, Any]
) -> None:
    client, _ = as_role(UserRole.DENTIST)
    first = _scan(client).json()
    client.put(f"/api/v1/prescriptions/{first['id']}", json=_save_body())

    second = _scanned(client)
    matches = second["patient_matches"]
    assert len(matches) == 1
    assert matches[0]["patient"]["patient_code"] == "RR-1042"
    assert set(matches[0]["reasons"]) == {"Same patient ID", "Same phone number", "Similar name"}

    res = client.put(
        f"/api/v1/prescriptions/{second['id']}",
        json=_save_body(new_patient=None, patient_id=matches[0]["patient"]["id"], visit_date="2026-10-15"),
    )
    assert res.status_code == 200, res.text
    patient = client.get("/api/v1/patients").json()["items"][0]
    assert patient["visit_count"] == 2


def test_duplicate_patient_code_is_rejected(as_role: AsRole, extraction: dict[str, Any]) -> None:
    client, _ = as_role(UserRole.DENTIST)
    first = _scan(client).json()
    client.put(f"/api/v1/prescriptions/{first['id']}", json=_save_body())

    second = _scan(client).json()
    res = client.put(f"/api/v1/prescriptions/{second['id']}", json=_save_body())
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "patient_code_taken"


def test_patient_code_is_generated_when_missing(
    as_role: AsRole, extraction: dict[str, Any]
) -> None:
    client, _ = as_role(UserRole.DENTIST)
    draft = _scan(client).json()
    res = client.put(
        f"/api/v1/prescriptions/{draft['id']}",
        json=_save_body(new_patient={"full_name": "Karim Hossain"}),
    )
    assert res.status_code == 200, res.text
    assert res.json()["patient"]["patient_code"].startswith("P-")


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"follow_up_date": "2026-10-01"}, "The follow-up date cannot be before the visit date"),
        ({"new_patient": None}, "Choose an existing patient or enter a new one"),
    ],
)
def test_save_validation(
    as_role: AsRole, extraction: dict[str, Any], overrides: dict[str, Any], message: str
) -> None:
    client, _ = as_role(UserRole.DENTIST)
    draft = _scan(client).json()
    res = client.put(f"/api/v1/prescriptions/{draft['id']}", json=_save_body(**overrides))
    assert res.status_code == 422
    assert message in [d["message"] for d in res.json()["error"]["details"]]


def test_only_admin_deletes_filed_prescriptions(
    as_role: AsRole, extraction: dict[str, Any], storage: Path
) -> None:
    client, _ = as_role(UserRole.DENTIST)
    draft = _scan(client).json()
    client.put(f"/api/v1/prescriptions/{draft['id']}", json=_save_body())
    assert client.delete(f"/api/v1/prescriptions/{draft['id']}").status_code == 403

    other = _scan(client).json()
    assert client.delete(f"/api/v1/prescriptions/{other['id']}").status_code == 204
    assert len(list((storage / "prescriptions").glob("*.jpg"))) == 1


def test_interrupted_read_can_be_retried(
    as_role: AsRole, extraction: dict[str, Any], db: Session
) -> None:
    client, _ = as_role(UserRole.DENTIST)
    draft = _scanned(client)
    rx = prescription_service.get(db, draft["id"])
    rx.reading_started_at = rx.created_at - prescription_service.READING_TIMEOUT
    db.commit()

    stale = client.get(f"/api/v1/prescriptions/{draft['id']}").json()
    assert stale["reading"] is False
    assert stale["extraction_error"] == prescription_service.INTERRUPTED_MESSAGE
    assert client.post(f"/api/v1/prescriptions/{draft['id']}/extract").json()["reading"] is True


def test_draft_cannot_be_filed_while_reading(
    as_role: AsRole, extraction: dict[str, Any], db: Session
) -> None:
    client, _ = as_role(UserRole.DENTIST)
    draft = _scanned(client)
    rx = prescription_service.get(db, draft["id"])
    rx.reading_started_at = prescription_service.utcnow()
    db.commit()

    res = client.put(f"/api/v1/prescriptions/{draft['id']}", json=_save_body())
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "still_reading"


def test_filed_prescription_downloads_as_pdf(as_role: AsRole, extraction: dict[str, Any]) -> None:
    client, _ = as_role(UserRole.DENTIST)
    draft = _scanned(client)
    assert client.get(f"/api/v1/prescriptions/{draft['id']}/pdf").status_code == 400

    body = _save_body(advice=["Warm saline gargle", "গরম লবণ পানি দিয়ে কুলি করবেন"])
    client.put(f"/api/v1/prescriptions/{draft['id']}", json=body)
    res = client.get(f"/api/v1/prescriptions/{draft['id']}/pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert 'filename="prescription-Rahima-Begum-2026-10-08.pdf"' in res.headers["content-disposition"]
    assert res.content.startswith(b"%PDF")


def test_admin_deletes_a_patient_with_their_prescriptions(
    as_role: AsRole, extraction: dict[str, Any], storage: Path
) -> None:
    client, _ = as_role(UserRole.DENTIST)
    draft = _scanned(client)
    patient_id = client.put(f"/api/v1/prescriptions/{draft['id']}", json=_save_body()).json()["patient"]["id"]
    assert client.delete(f"/api/v1/patients/{patient_id}").status_code == 403

    client, _ = as_role(UserRole.ADMIN)
    assert client.delete(f"/api/v1/patients/{patient_id}").status_code == 204
    assert client.get(f"/api/v1/patients/{patient_id}").status_code == 404
    assert client.get(f"/api/v1/prescriptions/{draft['id']}").status_code == 404
    assert list((storage / "prescriptions").glob("*.jpg")) == []

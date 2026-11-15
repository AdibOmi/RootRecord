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
        "patient_id": None,
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

NEW_PATIENT = {"full_name": "Rahima Begum", "phone": "01712345678", "age_years": 34, "sex": "female"}


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
    """Stub the Gemini calls. Set state["error"] / state["header_error"] to simulate failures."""
    state: dict[str, Any] = {
        "result": EXTRACTED,
        "error": None,
        "calls": 0,
        "header_error": None,
        "header_calls": 0,
    }

    def fake_extract(images: list[bytes], media_type: str = "image/jpeg", today: object = None) -> dict:
        state["calls"] += 1
        state["pages"] = len(images)
        assert all(i[:2] == b"\xff\xd8" for i in images), "photos are re-encoded as JPEG before reading"
        if state["error"]:
            raise extraction_service.ExtractionError(state["error"])
        return state["result"]

    def fake_header(first_page: bytes) -> dict:
        state["header_calls"] += 1
        if state["header_error"]:
            raise extraction_service.ExtractionError(state["header_error"])
        return {"patient": state["result"]["patient"], "uncertain_fields": ["patient.age_years"]}

    monkeypatch.setattr(extraction_service, "extract", fake_extract)
    monkeypatch.setattr(extraction_service, "extract_header", fake_header)
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


def _register(client: TestClient, rx_id: str, **body: Any) -> Any:
    body.setdefault("new_patient", None if "patient_id" in body else NEW_PATIENT)
    return client.post(f"/api/v1/prescriptions/{rx_id}/register", json=body)


def _filed(client: TestClient, **body: Any) -> Any:
    """Scan and file under a (new) patient, as the assistant does at payment."""
    draft = _scanned(client)
    res = _register(client, draft["id"], **body)
    assert res.status_code == 200, res.text
    return res.json()


def _save_body(**overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "visit_date": "2026-10-08",
        "diagnosis": "Irreversible pulpitis 36",
        "procedures": ["RCT 36 - access opening"],
        "medications": [{"name": "Tab. Napa 500 mg", "frequency": "1+0+1", "duration": "5 days"}],
        "advice": ["Warm saline gargle"],
        "follow_up_date": "2026-10-15",
    }
    body.update(overrides)
    return body


# --- Scanning and reading ------------------------------------------------------


def test_scan_reads_the_patient_details_straight_away(
    as_role: AsRole, extraction: dict[str, Any]
) -> None:
    client, _ = as_role(UserRole.RECEPTIONIST)
    res = _scan(client)
    assert res.status_code == 201, res.text
    body = res.json()
    # Answered before the full read, but with the header already read.
    assert body["reading"] is True
    assert body["extracted"]["patient"]["full_name"] == "Rahima Begum"
    assert body["extracted"]["uncertain_fields"] == ["patient.age_years"]
    assert extraction["header_calls"] == 1


def test_failed_header_read_does_not_block_the_scan(
    as_role: AsRole, extraction: dict[str, Any]
) -> None:
    client, _ = as_role(UserRole.RECEPTIONIST)
    extraction["header_error"] = "busy"
    res = _scan(client)
    assert res.status_code == 201, res.text
    assert res.json()["extracted"] is None
    # The full read still fills everything in, including the patient.
    after = client.get(f"/api/v1/prescriptions/{res.json()['id']}").json()
    assert after["extracted"]["patient"]["phone"] == "01712345678"


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
    assert body["verified"] is False
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


# --- Filing at payment ---------------------------------------------------------


def test_assistant_files_a_new_patient_at_payment(
    as_role: AsRole, extraction: dict[str, Any]
) -> None:
    client, assistant = as_role(UserRole.RECEPTIONIST)
    draft = _scanned(client)
    res = _register(client, draft["id"], billed_minor=150_000, paid_minor=100_000)
    assert res.status_code == 200, res.text
    filed = res.json()

    assert filed["status"] == "confirmed"
    assert filed["confirmed_by"]["id"] == str(assistant.id)
    # Visible straight away, but not checked by a dentist yet.
    assert filed["verified"] is False
    assert filed["verified_by"] is None
    code = filed["patient"]["patient_code"]
    assert len(code) == 8 and code.isdigit() and code[0] != "0"
    assert (filed["billed_minor"], filed["paid_minor"], filed["due_minor"]) == (150_000, 100_000, 50_000)

    patients = client.get("/api/v1/patients", params={"q": "rahima"}).json()
    assert patients["total"] == 1
    patient = patients["items"][0]
    assert patient["phone"] == "+8801712345678"
    assert patient["visit_count"] == 1
    assert patient["last_visit_date"] == "2026-10-08"
    # The ID is found however it is typed.
    assert client.get("/api/v1/patients", params={"q": f"{code[:4]}-{code[4:]}"}).json()["total"] == 1

    history = client.get("/api/v1/prescriptions", params={"patient_id": patient["id"]}).json()
    assert [p["id"] for p in history["items"]] == [draft["id"]]


def test_visit_can_be_filed_while_still_reading(
    as_role: AsRole, extraction: dict[str, Any], db: Session
) -> None:
    client, _ = as_role(UserRole.RECEPTIONIST)
    extraction["error"] = "busy"  # nothing read yet: no visit date from the photo
    draft = _scanned(client)
    rx = prescription_service.get(db, draft["id"])
    rx.reading_started_at = prescription_service.utcnow()
    db.commit()

    res = _register(client, draft["id"])
    assert res.status_code == 200, res.text
    assert res.json()["visit_date"] == prescription_service.clinic_today().isoformat()

    # When reading finishes it still fills in the filed visit.
    extraction["error"] = None
    prescription_service.read_in_background(rx.id)
    after = client.get(f"/api/v1/prescriptions/{draft['id']}").json()
    assert after["diagnosis"] == "Irreversible pulpitis 36"
    assert after["visit_date"] == "2026-10-08"
    assert after["patient"]["full_name"] == "Rahima Begum"


def test_returning_patient_is_matched_on_phone_and_name(
    as_role: AsRole, extraction: dict[str, Any]
) -> None:
    client, _ = as_role(UserRole.RECEPTIONIST)
    first = _filed(client)

    second = _scanned(client)
    matches = second["patient_matches"]
    assert len(matches) == 1
    assert matches[0]["patient"]["id"] == first["patient"]["id"]
    assert set(matches[0]["reasons"]) == {"same_phone", "similar_name"}
    assert matches[0]["strong"] is True

    res = _register(client, second["id"], patient_id=matches[0]["patient"]["id"])
    assert res.status_code == 200, res.text
    assert res.json()["patient"]["patient_code"] == first["patient"]["patient_code"]
    assert client.get("/api/v1/patients").json()["items"][0]["visit_count"] == 2


def test_family_member_on_the_same_phone_is_not_a_strong_match(
    as_role: AsRole, extraction: dict[str, Any]
) -> None:
    client, _ = as_role(UserRole.RECEPTIONIST)
    _filed(client)

    extraction["result"] = {
        **EXTRACTED,
        "patient": {**EXTRACTED["patient"], "full_name": "Tanvir Ahmed", "age_years": 9},
    }
    matches = _scanned(client)["patient_matches"]
    assert [m["reasons"] for m in matches] == [["same_phone"]]
    assert matches[0]["strong"] is False


def test_id_written_on_the_prescription_is_a_strong_match(
    as_role: AsRole, extraction: dict[str, Any]
) -> None:
    client, _ = as_role(UserRole.RECEPTIONIST)
    code = _filed(client)["patient"]["patient_code"]

    extraction["result"] = {
        **EXTRACTED,
        "patient": {
            "patient_id": f"{code[:4]}-{code[4:]}",
            "full_name": None,
            "age_years": None,
            "sex": None,
            "phone": None,
        },
    }
    matches = _scanned(client)["patient_matches"]
    assert matches[0]["patient"]["patient_code"] == code
    assert matches[0]["reasons"] == ["same_id"]
    assert matches[0]["strong"] is True


def test_patient_id_cannot_be_chosen_or_changed(
    as_role: AsRole, extraction: dict[str, Any]
) -> None:
    client, _ = as_role(UserRole.RECEPTIONIST)
    filed = _filed(client, new_patient={**NEW_PATIENT, "patient_code": "11111111"})
    code = filed["patient"]["patient_code"]
    assert code != "11111111"

    res = client.patch(
        f"/api/v1/patients/{filed['patient']['id']}", json={"patient_code": "22222222", "age_years": 35}
    )
    assert res.status_code == 200, res.text
    assert res.json()["patient_code"] == code
    assert res.json()["age_years"] == 35


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ({"billed_minor": 1000, "paid_minor": 2000}, "The amount paid cannot be more than the bill"),
        ({"paid_minor": 2000}, "Enter the bill before the amount paid"),
        ({"new_patient": None}, "Choose an existing patient or enter a new one"),
    ],
)
def test_register_validation(
    as_role: AsRole, extraction: dict[str, Any], body: dict[str, Any], message: str
) -> None:
    client, _ = as_role(UserRole.RECEPTIONIST)
    draft = _scanned(client)
    res = client.post(
        f"/api/v1/prescriptions/{draft['id']}/register", json={"new_patient": NEW_PATIENT, **body}
    )
    assert res.status_code == 422
    assert message in [d["message"] for d in res.json()["error"]["details"]]


def test_payment_can_be_corrected(as_role: AsRole, extraction: dict[str, Any]) -> None:
    client, _ = as_role(UserRole.RECEPTIONIST)
    draft = _scanned(client)
    res = client.put(f"/api/v1/prescriptions/{draft['id']}/payment", json={"billed_minor": 500})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "not_filed"

    filed = _register(client, draft["id"], billed_minor=200_000).json()
    assert filed["due_minor"] == 200_000
    res = client.put(
        f"/api/v1/prescriptions/{filed['id']}/payment",
        json={"billed_minor": 200_000, "paid_minor": 200_000},
    )
    assert res.status_code == 200, res.text
    assert res.json()["due_minor"] == 0


# --- Dentist's check -----------------------------------------------------------


def test_only_a_dentist_checks_what_was_read(
    as_role: AsRole, extraction: dict[str, Any]
) -> None:
    client, _ = as_role(UserRole.RECEPTIONIST)
    filed = _filed(client)
    assert client.put(f"/api/v1/prescriptions/{filed['id']}", json=_save_body()).status_code == 403

    unchecked = client.get(
        "/api/v1/prescriptions", params={"status": "confirmed", "verified": False}
    ).json()
    assert [p["id"] for p in unchecked["items"]] == [filed["id"]]

    client, dentist = as_role(UserRole.DENTIST)
    res = client.put(f"/api/v1/prescriptions/{filed['id']}", json=_save_body(diagnosis="Pulpitis 36"))
    assert res.status_code == 200, res.text
    checked = res.json()
    assert checked["verified"] is True
    assert checked["verified_by"]["id"] == str(dentist.id)
    assert checked["diagnosis"] == "Pulpitis 36"
    assert client.get("/api/v1/prescriptions", params={"verified": False}).json()["total"] == 0

    # Once checked, it is not read again.
    assert client.post(f"/api/v1/prescriptions/{filed['id']}/extract").status_code == 400


def test_late_read_does_not_overwrite_the_dentists_check(
    as_role: AsRole, extraction: dict[str, Any]
) -> None:
    client, _ = as_role(UserRole.DENTIST)
    filed = _filed(client)
    client.put(f"/api/v1/prescriptions/{filed['id']}", json=_save_body(diagnosis="Pulpitis 36"))

    prescription_service.read_in_background(filed["id"])
    assert client.get(f"/api/v1/prescriptions/{filed['id']}").json()["diagnosis"] == "Pulpitis 36"


def test_draft_must_be_filed_before_it_is_checked(
    as_role: AsRole, extraction: dict[str, Any]
) -> None:
    client, _ = as_role(UserRole.DENTIST)
    draft = _scanned(client)
    res = client.put(f"/api/v1/prescriptions/{draft['id']}", json=_save_body())
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "not_filed"


def test_cannot_be_checked_while_reading(
    as_role: AsRole, extraction: dict[str, Any], db: Session
) -> None:
    client, _ = as_role(UserRole.DENTIST)
    filed = _filed(client)
    rx = prescription_service.get(db, filed["id"])
    rx.reading_started_at = prescription_service.utcnow()
    db.commit()

    res = client.put(f"/api/v1/prescriptions/{filed['id']}", json=_save_body())
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "still_reading"


def test_save_validation(as_role: AsRole, extraction: dict[str, Any]) -> None:
    client, _ = as_role(UserRole.DENTIST)
    filed = _filed(client)
    res = client.put(
        f"/api/v1/prescriptions/{filed['id']}", json=_save_body(follow_up_date="2026-10-01")
    )
    assert res.status_code == 422
    messages = [d["message"] for d in res.json()["error"]["details"]]
    assert "The follow-up date cannot be before the visit date" in messages


# --- Deleting and sharing ------------------------------------------------------


def test_assistant_can_discard_drafts_only(as_role: AsRole, extraction: dict[str, Any]) -> None:
    client, _ = as_role(UserRole.RECEPTIONIST)
    draft = _scan(client).json()
    assert client.delete(f"/api/v1/prescriptions/{draft['id']}").status_code == 204

    filed = _filed(client)
    assert client.delete(f"/api/v1/prescriptions/{filed['id']}").status_code == 403


def test_only_admin_deletes_filed_prescriptions(
    as_role: AsRole, extraction: dict[str, Any], storage: Path
) -> None:
    client, _ = as_role(UserRole.DENTIST)
    filed = _filed(client)
    assert client.delete(f"/api/v1/prescriptions/{filed['id']}").status_code == 403

    other = _scan(client).json()
    assert client.delete(f"/api/v1/prescriptions/{other['id']}").status_code == 204
    assert len(list((storage / "prescriptions").glob("*.jpg"))) == 1

    client, _ = as_role(UserRole.ADMIN)
    assert client.delete(f"/api/v1/prescriptions/{filed['id']}").status_code == 204


def test_filed_prescription_downloads_as_pdf(as_role: AsRole, extraction: dict[str, Any]) -> None:
    client, _ = as_role(UserRole.DENTIST)
    draft = _scanned(client)
    assert client.get(f"/api/v1/prescriptions/{draft['id']}/pdf").status_code == 400

    _register(client, draft["id"])
    # Unchecked visits can be shared too (the PDF says it is not checked yet).
    assert client.get(f"/api/v1/prescriptions/{draft['id']}/pdf").status_code == 200

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
    filed = _filed(client)
    patient_id = filed["patient"]["id"]
    assert client.delete(f"/api/v1/patients/{patient_id}").status_code == 403

    client, _ = as_role(UserRole.ADMIN)
    assert client.delete(f"/api/v1/patients/{patient_id}").status_code == 204
    assert client.get(f"/api/v1/patients/{patient_id}").status_code == 404
    assert client.get(f"/api/v1/prescriptions/{filed['id']}").status_code == 404
    assert list((storage / "prescriptions").glob("*.jpg")) == []

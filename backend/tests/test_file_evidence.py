import uuid

import pytest

from app.models import ClaimScore, Evidence, User, slug_uuid
from app.scanner.base import EICAR
from app.services.file_evidence import create_file_upload, process_uploaded_file
from app.services.seed_data import load_seed_from_file
from app.storage.factory import get_storage, reset_storage_for_tests
from app.services.rate_limit import reset_rate_limits_for_tests
from app.scanner import reset_scanner_for_tests


@pytest.fixture(autouse=True)
def _phase1_test_env(monkeypatch):
    monkeypatch.setenv("STORAGE_BACKEND", "memory")
    monkeypatch.setenv("SCANNER_BACKEND", "fake")
    reset_storage_for_tests()
    reset_scanner_for_tests()
    reset_rate_limits_for_tests()
    yield
    reset_rate_limits_for_tests()


def _headers(i: int = 0):
    return {
        "X-Dev-User-External-Id": f"uploader-{i}",
        "X-Dev-Display-Name": f"up{i}",
    }


def test_upload_rejects_invalid_mime(client, db_session):
    load_seed_from_file(db_session)
    db_session.commit()
    cid = slug_uuid("c1")
    r = client.post(
        f"/v1/claims/{cid}/evidence/file/upload-url",
        headers=_headers(),
        json={
            "title": "bad",
            "summary": "x",
            "stance": "true",
            "fileName": "x.exe",
            "fileMime": "application/x-msdownload",
            "fileSize": 100,
        },
    )
    assert r.status_code == 422


def test_file_scan_clean_updates_scoring(client, db_session):
    load_seed_from_file(db_session)
    db_session.commit()
    cid = slug_uuid("c1")
    body = b"%PDF-1.4 clean"
    r = client.post(
        f"/v1/claims/{cid}/evidence/file/upload-url",
        headers=_headers(),
        json={
            "title": "PDF stats",
            "summary": "scan me",
            "stance": "true",
            "fileName": "doc.pdf",
            "fileMime": "application/pdf",
            "fileSize": len(body),
        },
    )
    assert r.status_code == 201
    eid = uuid.UUID(r.json()["evidenceId"])
    row = db_session.get(Evidence, eid)
    assert row and row.quarantine_file_key
    storage = get_storage()
    storage.put_object(
        storage.quarantine_bucket,
        row.quarantine_file_key,
        body,
        content_type="application/pdf",
    )
    process_uploaded_file(db_session, eid)
    db_session.commit()
    db_session.refresh(row)
    assert row.scan_status == "clean"
    assert row.file_key
    score = db_session.get(ClaimScore, cid)
    assert score is not None


def test_trust_blocked_until_clean(client, db_session):
    load_seed_from_file(db_session)
    db_session.commit()
    cid = slug_uuid("c1")
    user = User(external_id="trust-u", display_name="tu")
    db_session.add(user)
    db_session.flush()
    row, _url = create_file_upload(
        db_session,
        claim_id=cid,
        user_id=user.id,
        title="pending file",
        summary="s",
        stance="true",
        file_name="a.pdf",
        file_mime="application/pdf",
        file_size=5,
    )
    storage = get_storage()
    storage.put_object(
        storage.quarantine_bucket,
        row.quarantine_file_key,
        b"12345",
        content_type="application/pdf",
    )
    db_session.commit()
    r = client.post(
        f"/v1/evidence/{row.id}/trust",
        headers={"X-Dev-User-External-Id": "trust-u", "X-Dev-Display-Name": "tu"},
    )
    assert r.status_code == 403


def test_infected_file_rejected(client, db_session):
    load_seed_from_file(db_session)
    db_session.commit()
    cid = slug_uuid("c1")
    r = client.post(
        f"/v1/claims/{cid}/evidence/file/upload-url",
        headers=_headers(2),
        json={
            "title": "virus",
            "summary": "eicar",
            "stance": "false",
            "fileName": "eicar.com",
            "fileMime": "application/pdf",
            "fileSize": len(EICAR),
        },
    )
    eid = uuid.UUID(r.json()["evidenceId"])
    row = db_session.get(Evidence, eid)
    storage = get_storage()
    storage.put_object(
        storage.quarantine_bucket,
        row.quarantine_file_key,
        EICAR,
        content_type="application/pdf",
    )
    process_uploaded_file(db_session, eid)
    db_session.commit()
    db_session.refresh(row)
    assert row.scan_status == "infected"
    assert row.status == "rejected"

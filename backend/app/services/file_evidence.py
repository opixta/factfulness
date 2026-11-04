"""Evidence file upload constants — keep aligned with mobile ALLOWED_EVIDENCE_MIMES."""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Claim, Evidence
from app.scanner import get_scanner
from app.scanner.base import ScanOutcome
from app.services.rate_limit import rate_limit_evidence_upload
from app.services.recompute import recompute_claim, touch_topic_activity
from app.storage.factory import get_storage

ALLOWED_MIMES = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf",
    }
)


def _safe_filename(name: str) -> str:
    base = name.split("/")[-1].split("\\")[-1]
    base = re.sub(r"[^a-zA-Z0-9._-]", "_", base)[:120]
    return base or "upload.bin"


def validate_file_meta(file_mime: str, file_size: int) -> None:
    if file_mime not in ALLOWED_MIMES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="INVALID_FILE_TYPE")
    if file_size < 1 or file_size > settings.max_evidence_file_bytes:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="INVALID_FILE_SIZE")


def quarantine_key(claim_id: uuid.UUID, evidence_id: uuid.UUID, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    return f"quarantine/{claim_id}/{evidence_id}/{uuid.uuid4().hex[:8]}.{ext}"


def clean_key(claim_id: uuid.UUID, evidence_id: uuid.UUID, filename: str) -> str:
    safe = _safe_filename(filename)
    return f"evidence/{claim_id}/{evidence_id}/{safe}"


def create_file_upload(
    db: Session,
    *,
    claim_id: uuid.UUID,
    user_id: uuid.UUID,
    title: str,
    summary: str,
    stance: str,
    file_name: str,
    file_mime: str,
    file_size: int,
) -> tuple[Evidence, str]:
    rate_limit_evidence_upload(str(user_id))
    validate_file_meta(file_mime, file_size)
    storage = get_storage()
    eid = uuid.uuid4()
    qkey = quarantine_key(claim_id, eid, file_name)
    row = Evidence(
        id=eid,
        claim_id=claim_id,
        user_id=user_id,
        title=title,
        summary=summary,
        stance=stance,
        url=None,
        file_mime=file_mime,
        file_size=file_size,
        scan_status="pending",
        status="active",
        quarantine_file_key=qkey,
    )
    db.add(row)
    db.flush()
    upload_url = storage.presign_put(
        storage.quarantine_bucket,
        qkey,
        content_type=file_mime,
        expires_in=settings.presigned_upload_ttl_seconds,
    )
    return row, upload_url


def process_uploaded_file(db: Session, evidence_id: uuid.UUID) -> Evidence:
    row = db.get(Evidence, evidence_id)
    if not row or not row.quarantine_file_key:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    if row.scan_status != "pending":
        return row

    storage = get_storage()
    try:
        head = storage.head_object(storage.quarantine_bucket, row.quarantine_file_key)
    except FileNotFoundError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="UPLOAD_NOT_FOUND") from exc

    size = int(head.get("ContentLength") or 0)
    if row.file_size and size != row.file_size:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="FILE_SIZE_MISMATCH")
    if size > settings.max_evidence_file_bytes:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="INVALID_FILE_SIZE")

    data = storage.get_object_bytes(storage.quarantine_bucket, row.quarantine_file_key)
    outcome = get_scanner().scan(data)
    row.scanned_at = datetime.now(timezone.utc)

    if outcome == ScanOutcome.INFECTED:
        storage.delete_object(storage.quarantine_bucket, row.quarantine_file_key)
        row.scan_status = "infected"
        row.status = "rejected"
        row.quarantine_file_key = None
    else:
        dest = clean_key(row.claim_id, row.id, row.title)
        storage.copy_object(
            storage.quarantine_bucket,
            row.quarantine_file_key,
            storage.clean_bucket,
            dest,
        )
        storage.delete_object(storage.quarantine_bucket, row.quarantine_file_key)
        row.file_key = dest
        row.quarantine_file_key = None
        row.scan_status = "clean"

    score = recompute_claim(db, row.claim_id)
    claim = db.get(Claim, row.claim_id)
    if claim:
        touch_topic_activity(db, claim.topic_id)
    db.flush()
    return row


def presigned_download_url(row: Evidence) -> str:
    if not row.file_key or row.scan_status != "clean":
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="FILE_NOT_AVAILABLE")
    storage = get_storage()
    return storage.presign_get(
        storage.clean_bucket,
        row.file_key,
        expires_in=settings.presigned_download_ttl_seconds,
    )

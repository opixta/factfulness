import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models import Claim, Comment, ContentReport, Topic


def report_content(
    db: Session,
    *,
    reporter_id: uuid.UUID,
    target_type: str,
    target_id: uuid.UUID,
    reason: str | None,
) -> tuple[int, bool]:
    existing = (
        db.query(ContentReport)
        .filter(
            ContentReport.target_type == target_type,
            ContentReport.target_id == target_id,
            ContentReport.reporter_id == reporter_id,
        )
        .one_or_none()
    )
    if not existing:
        db.add(
            ContentReport(
                target_type=target_type,
                target_id=target_id,
                reporter_id=reporter_id,
                reason=reason,
            )
        )
        db.flush()

    distinct = (
        db.query(ContentReport)
        .filter(
            ContentReport.target_type == target_type,
            ContentReport.target_id == target_id,
        )
        .count()
    )

    hidden = False
    if distinct >= settings.report_auto_hide_threshold:
        hidden = _apply_auto_hide(db, target_type, target_id)
    return distinct, hidden


def _apply_auto_hide(db: Session, target_type: str, target_id: uuid.UUID) -> bool:
    now = datetime.now(timezone.utc)
    if target_type == "topic":
        row = db.get(Topic, target_id)
        if not row or row.hidden_at:
            return bool(row and row.hidden_at)
        row.hidden_at = now
        return True
    if target_type == "claim":
        row = db.get(Claim, target_id)
        if not row or row.hidden_at:
            return bool(row and row.hidden_at)
        row.hidden_at = now
        return True
    if target_type == "comment":
        row = db.get(Comment, target_id)
        if not row or row.hidden_at:
            return bool(row and row.hidden_at)
        row.hidden_at = now
        return True
    return False

import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, get_current_user, get_optional_user
from app.models import Claim, Comment, Evidence, EvidenceTrust, Topic, Vote
from app.schemas.dto import (
    ClaimDetailOut,
    CommentIn,
    ContentReportIn,
    EvidenceIn,
    FileEvidenceUploadIn,
    ProposeClaimIn,
    ProposeTopicIn,
    TopicDetailOut,
    TopicListItem,
    VoteIn,
)
from app.services.file_evidence import (
    create_file_upload,
    presigned_download_url,
    process_uploaded_file,
)
from app.services.rate_limit import rate_limit_evidence_create
from app.services.bootstrap import build_bootstrap
from app.services.link_enrichment import build_wayback_archive_url, site_name_from_url
from app.services.recompute import recompute_claim, touch_topic_activity
from app.services.reports import report_content
from app.services.search_content import search_title_hits
from app.services.serialize import claim_detail, claim_summary, topic_detail, topic_list_item

router = APIRouter()


@router.get("/topics", response_model=dict)
def list_topics(
    db: Session = Depends(get_db),
    optional: CurrentUser | None = Depends(get_optional_user),
) -> dict:
    uid = optional.user.id if optional else None
    topics = db.query(Topic).filter(Topic.hidden_at.is_(None)).order_by(Topic.updated_at.desc()).all()
    items = [topic_list_item(db, t) for t in topics]
    return {"topics": items}


@router.get("/topics/{topic_id}", response_model=TopicDetailOut)
def get_topic(
    topic_id: uuid.UUID,
    db: Session = Depends(get_db),
    optional: CurrentUser | None = Depends(get_optional_user),
) -> TopicDetailOut:
    topic = db.get(Topic, topic_id)
    if not topic or topic.hidden_at:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    uid = optional.user.id if optional else None
    return topic_detail(db, topic, uid)


@router.post("/topics", status_code=status.HTTP_201_CREATED)
def create_topic(
    body: ProposeTopicIn,
    db: Session = Depends(get_db),
    auth: CurrentUser = Depends(get_current_user),
) -> dict:
    tid = uuid.uuid4()
    cid = uuid.uuid4()
    topic = Topic(id=tid, title=body.title, summary=body.summary, created_by=auth.user.id)
    claim = Claim(id=cid, topic_id=tid, text=body.firstClaimText, created_by=auth.user.id)
    db.add(topic)
    db.add(claim)
    db.flush()
    recompute_claim(db, cid)
    touch_topic_activity(db, tid)
    db.commit()
    uid = auth.user.id
    return {
        "topic": topic_list_item(db, topic),
        "firstClaim": claim_summary(db, claim, uid),
    }


@router.post("/topics/{topic_id}/claims", status_code=status.HTTP_201_CREATED)
def create_claim(
    topic_id: uuid.UUID,
    body: ProposeClaimIn,
    db: Session = Depends(get_db),
    auth: CurrentUser = Depends(get_current_user),
) -> dict:
    topic = db.get(Topic, topic_id)
    if not topic or topic.hidden_at:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    cid = uuid.uuid4()
    claim = Claim(
        id=cid,
        topic_id=topic_id,
        text=body.text,
        reason=body.reason,
        created_by=auth.user.id,
    )
    db.add(claim)
    db.flush()
    recompute_claim(db, cid)
    touch_topic_activity(db, topic_id)
    db.commit()
    return {"claim": claim_summary(db, claim, auth.user.id)}


@router.get("/claims/{claim_id}", response_model=ClaimDetailOut)
def get_claim(
    claim_id: uuid.UUID,
    db: Session = Depends(get_db),
    optional: CurrentUser | None = Depends(get_optional_user),
) -> ClaimDetailOut:
    claim = db.get(Claim, claim_id)
    if not claim or claim.hidden_at:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    uid = optional.user.id if optional else None
    return claim_detail(db, claim, uid)


@router.put("/claims/{claim_id}/vote")
def cast_vote(
    claim_id: uuid.UUID,
    body: VoteIn,
    db: Session = Depends(get_db),
    auth: CurrentUser = Depends(get_current_user),
) -> dict:
    if body.value not in ("true", "false"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid vote value")
    claim = db.get(Claim, claim_id)
    if not claim or claim.hidden_at:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    val = body.value == "true"
    vote = db.get(Vote, (claim_id, auth.user.id))
    if vote:
        vote.value = val
    else:
        db.add(Vote(claim_id=claim_id, user_id=auth.user.id, value=val))
    score = recompute_claim(db, claim_id)
    touch_topic_activity(db, claim.topic_id)
    db.commit()
    from app.services.serialize import scores_dto

    return {"scores": scores_dto(db, claim_id, score, auth.user.id)}


@router.post("/claims/{claim_id}/evidence", status_code=status.HTTP_201_CREATED)
def add_evidence(
    claim_id: uuid.UUID,
    body: EvidenceIn,
    db: Session = Depends(get_db),
    auth: CurrentUser = Depends(get_current_user),
) -> dict:
    claim = db.get(Claim, claim_id)
    if not claim or claim.hidden_at:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    rate_limit_evidence_create(str(auth.user.id))
    row = Evidence(
        claim_id=claim_id,
        user_id=auth.user.id,
        title=body.title,
        url=body.url or None,
        stance=body.stance,
        summary=body.summary,
        preview_status="success" if body.url else None,
        og_title=body.title if body.url else None,
    )
    if body.url:
        row.og_site_name = site_name_from_url(body.url)
        row.archive_url = build_wayback_archive_url(body.url)
        row.archive_status = "success"
    db.add(row)
    db.flush()
    score = recompute_claim(db, claim_id)
    touch_topic_activity(db, claim.topic_id)
    db.commit()
    from app.services.serialize import evidence_dto

    return {"evidence": evidence_dto(db, row), "scores": claim_summary(db, claim, auth.user.id).scores}


@router.post("/claims/{claim_id}/comments", status_code=status.HTTP_201_CREATED)
def add_comment(
    claim_id: uuid.UUID,
    body: CommentIn,
    db: Session = Depends(get_db),
    auth: CurrentUser = Depends(get_current_user),
) -> dict:
    from app.services.moderation import assert_comment_allowed

    assert_comment_allowed(body.body)
    claim = db.get(Claim, claim_id)
    if not claim or claim.hidden_at:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    linked = None
    if body.vote == "true":
        linked = True
    elif body.vote == "false":
        linked = False
    comment = Comment(
        claim_id=claim_id,
        user_id=auth.user.id,
        body=body.body,
        linked_vote=linked,
    )
    db.add(comment)
    if linked is not None:
        val = linked
        vote = db.get(Vote, (claim_id, auth.user.id))
        if vote:
            vote.value = val
        else:
            db.add(Vote(claim_id=claim_id, user_id=auth.user.id, value=val))
    score = recompute_claim(db, claim_id)
    touch_topic_activity(db, claim.topic_id)
    db.commit()
    from app.services.serialize import comment_dto

    return {
        "comment": comment_dto(comment, auth.user),
        "scores": claim_summary(db, claim, auth.user.id).scores,
    }


@router.post("/evidence/{evidence_id}/trust")
def add_trust(
    evidence_id: uuid.UUID,
    db: Session = Depends(get_db),
    auth: CurrentUser = Depends(get_current_user),
) -> dict:
    row = db.get(Evidence, evidence_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    if row.file_mime and row.scan_status != "clean":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="TRUST_FILE_NOT_READY")
    existing = db.get(EvidenceTrust, (evidence_id, auth.user.id))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Already trusted")
    db.add(EvidenceTrust(evidence_id=evidence_id, user_id=auth.user.id))
    claim = db.get(Claim, row.claim_id)
    assert claim
    score = recompute_claim(db, row.claim_id)
    touch_topic_activity(db, claim.topic_id)
    db.commit()
    from app.services.serialize import evidence_dto

    return {
        "evidence": evidence_dto(db, row),
        "scores": claim_summary(db, claim, auth.user.id).scores,
    }


@router.get("/bootstrap")
def bootstrap(
    db: Session = Depends(get_db),
    optional: CurrentUser | None = Depends(get_optional_user),
) -> dict:
    uid = optional.user.id if optional else None
    payload = build_bootstrap(db, uid)
    prefs = {"notifyVerdictChange": True}
    if optional:
        prefs = {"notifyVerdictChange": optional.user.notify_verdict_change}
    payload["notificationPrefs"] = prefs
    return payload


@router.get("/search")
def search(
    q: str = "",
    limit: int = 30,
    cursor: str | None = None,
    db: Session = Depends(get_db),
) -> dict:
    hits, next_cursor = search_title_hits(db, q, limit=limit, cursor=cursor)
    return {
        "hits": [h.model_dump(mode="json") for h in hits],
        "nextCursor": next_cursor,
    }


@router.post("/content/report")
def content_report(
    body: ContentReportIn,
    db: Session = Depends(get_db),
    auth: CurrentUser = Depends(get_current_user),
) -> dict:
    if body.targetType not in ("topic", "claim", "comment"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid targetType")
    distinct, hidden = report_content(
        db,
        reporter_id=auth.user.id,
        target_type=body.targetType,
        target_id=body.targetId,
        reason=body.reason,
    )
    db.commit()
    return {"distinctReports": distinct, "hidden": hidden}


@router.post("/claims/{claim_id}/evidence/file/upload-url", status_code=status.HTTP_201_CREATED)
def file_upload_url(
    claim_id: uuid.UUID,
    body: FileEvidenceUploadIn,
    db: Session = Depends(get_db),
    auth: CurrentUser = Depends(get_current_user),
) -> dict:
    claim = db.get(Claim, claim_id)
    if not claim or claim.hidden_at:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    row, upload_url = create_file_upload(
        db,
        claim_id=claim_id,
        user_id=auth.user.id,
        title=body.title,
        summary=body.summary,
        stance=body.stance,
        file_name=body.fileName,
        file_mime=body.fileMime,
        file_size=body.fileSize,
    )
    touch_topic_activity(db, claim.topic_id)
    db.commit()
    from app.config import settings

    return {
        "evidenceId": str(row.id),
        "uploadUrl": upload_url,
        "uploadHeaders": {"Content-Type": body.fileMime},
        "expiresIn": settings.presigned_upload_ttl_seconds,
    }


def _run_scan(evidence_id: uuid.UUID) -> None:
    from app.db import SessionLocal

    db = SessionLocal()
    try:
        process_uploaded_file(db, evidence_id)
        db.commit()
    finally:
        db.close()


@router.post("/claims/{claim_id}/evidence/{evidence_id}/file/complete")
def file_upload_complete(
    claim_id: uuid.UUID,
    evidence_id: uuid.UUID,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    auth: CurrentUser = Depends(get_current_user),
) -> dict:
    row = db.get(Evidence, evidence_id)
    if not row or row.claim_id != claim_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    if row.user_id != auth.user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN)
    background.add_task(_run_scan, evidence_id)
    db.commit()
    from app.services.serialize import evidence_dto

    return {"evidence": evidence_dto(db, row), "scanStatus": row.scan_status}


@router.get("/evidence/{evidence_id}/file/scan-status")
def file_scan_status(
    evidence_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> dict:
    row = db.get(Evidence, evidence_id)
    if not row or not row.file_mime:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    from app.services.serialize import evidence_dto

    return {
        "evidence": evidence_dto(db, row),
        "scanStatus": row.scan_status,
    }


@router.get("/evidence/{evidence_id}/download-url")
def evidence_download_url(
    evidence_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> dict:
    row = db.get(Evidence, evidence_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    url = presigned_download_url(row)
    from app.config import settings
    from datetime import datetime, timedelta, timezone

    expires = datetime.now(timezone.utc) + timedelta(seconds=settings.presigned_download_ttl_seconds)
    return {"url": url, "expiresAt": expires.isoformat()}

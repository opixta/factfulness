"""Notify participants when claim verdict (fact_status) changes."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Claim, Comment, Evidence, EvidenceTrust, PushToken, Topic, User, Vote
from app.services.expo_push import PushMessage, get_push_sender

VERDICT_KO = {
    "pending": "대기",
    "fact": "Fact",
    "lie": "Lie",
}


def _status_label(status: str | None) -> str:
    if not status:
        return VERDICT_KO["pending"]
    return VERDICT_KO.get(status, status)


def format_verdict_push_body(claim_text: str, old_status: str | None, new_status: str) -> tuple[str, str]:
    snippet = claim_text.strip()
    if len(snippet) > 36:
        snippet = snippet[:36] + "…"
    title = "판정 변경"
    body = (
        f"「{snippet}」 판정이 "
        f"{_status_label(old_status)} → {_status_label(new_status)}(으)로 바뀌었습니다."
    )
    return title, body


def participant_user_ids(db: Session, claim_id: uuid.UUID) -> set[uuid.UUID]:
    ids: set[uuid.UUID] = set()
    for uid in db.scalars(select(Vote.user_id).where(Vote.claim_id == claim_id)):
        ids.add(uid)
    for uid in db.scalars(select(Comment.user_id).where(Comment.claim_id == claim_id)):
        ids.add(uid)
    for uid in db.scalars(select(Evidence.user_id).where(Evidence.claim_id == claim_id)):
        ids.add(uid)
    ev_ids = db.scalars(select(Evidence.id).where(Evidence.claim_id == claim_id))
    for eid in ev_ids:
        for uid in db.scalars(select(EvidenceTrust.user_id).where(EvidenceTrust.evidence_id == eid)):
            ids.add(uid)
    return ids


def notify_verdict_change(
    db: Session,
    claim_id: uuid.UUID,
    old_status: str | None,
    new_status: str,
) -> None:
    if old_status == new_status:
        return
    claim = db.get(Claim, claim_id)
    if not claim or claim.hidden_at is not None:
        return
    topic = db.get(Topic, claim.topic_id)
    if not topic:
        return

    title, body = format_verdict_push_body(claim.text, old_status, new_status)
    sender = get_push_sender()
    messages: list[PushMessage] = []
    token_rows: list[PushToken] = []

    for user_id in participant_user_ids(db, claim_id):
        user = db.get(User, user_id)
        if not user or not user.notify_verdict_change:
            continue
        tokens = db.scalars(select(PushToken).where(PushToken.user_id == user_id)).all()
        for row in tokens:
            messages.append(
                PushMessage(
                    to=row.expo_token,
                    title=title,
                    body=body,
                    data={
                        "claimId": str(claim_id),
                        "topicId": str(claim.topic_id),
                        "verdict": new_status,
                    },
                )
            )
            token_rows.append(row)

    if not messages:
        return

    tickets = sender.send(messages)
    for row, ticket in zip(token_rows, tickets, strict=False):
        if ticket.status != "ok":
            err = (ticket.details or {}).get("error")
            if err == "DeviceNotRegistered":
                db.delete(row)
    db.flush()

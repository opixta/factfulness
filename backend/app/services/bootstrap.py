from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Claim, Comment, Evidence, Topic, User
from app.schemas.dto import CommentDto
from app.services.serialize import claim_summary, evidence_dto, topic_list_item


def build_bootstrap(db: Session, user_id: UUID | None) -> dict:
    topics = db.query(Topic).filter(Topic.hidden_at.is_(None)).order_by(Topic.updated_at.desc()).all()
    topic_items = [topic_list_item(db, t).model_dump(mode="json") for t in topics]

    claims_out: dict[str, list] = {}
    evidence_out: dict[str, list] = {}
    comments_out: dict[str, list] = {}

    for topic in topics:
        claim_rows = (
            db.query(Claim)
            .filter(Claim.topic_id == topic.id, Claim.hidden_at.is_(None))
            .order_by(Claim.created_at.asc())
            .all()
        )
        claims_out[str(topic.id)] = [
            claim_summary(db, c, user_id).model_dump(mode="json") for c in claim_rows
        ]
        for c in claim_rows:
            cid = str(c.id)
            ev_rows = db.query(Evidence).filter(Evidence.claim_id == c.id).all()
            evidence_out[cid] = [evidence_dto(db, e).model_dump(mode="json") for e in ev_rows]
            comment_rows = (
                db.query(Comment, User)
                .join(User, User.id == Comment.user_id)
                .filter(Comment.claim_id == c.id, Comment.hidden_at.is_(None))
                .order_by(Comment.created_at.desc())
                .all()
            )
            comments_out[cid] = [
                CommentDto(
                    id=row.id,
                    author=u.display_name,
                    body=row.body,
                    vote="true"
                    if row.linked_vote is True
                    else "false"
                    if row.linked_vote is False
                    else None,
                    at=row.created_at,
                ).model_dump(mode="json")
                for row, u in comment_rows
            ]

    return {
        "topics": topic_items,
        "claims": claims_out,
        "evidence": evidence_out,
        "comments": comments_out,
    }

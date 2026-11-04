from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Claim, ClaimScore, Comment, Evidence, EvidenceTrust, Topic, User
from app.schemas.dto import (
    ClaimDetailOut,
    ClaimScoresDto,
    ClaimSummary,
    CommentDto,
    EvidenceDto,
    FactDto,
    TopicDetailOut,
    TopicListItem,
)
from app.services.recompute import recompute_claim, user_vote


def _fact_dto(score: ClaimScore) -> FactDto:
    return FactDto(
        status=score.fact_status,
        factPct=score.fact_pct,
        wTrue=score.w_true,
        wFalse=score.w_false,
        eligibleTrue=score.eligible_true,
        eligibleFalse=score.eligible_false,
        gatePassed=score.gate_passed,
        reasons=score.gate_reasons or [],
        ruleVersion=score.rule_version,
    )


def scores_dto(db: Session, claim_id: UUID, score: ClaimScore, uid: UUID | None) -> ClaimScoresDto:
    uv = user_vote(db, claim_id, uid) if uid else None
    return ClaimScoresDto(
        opinionPct=score.opinion_pct,
        votesTrue=score.votes_true,
        votesFalse=score.votes_false,
        userVote=uv,
        fact=_fact_dto(score),
    )


def topic_list_item(db: Session, topic: Topic) -> TopicListItem:
    claims = [c for c in topic.claims if not c.hidden_at]
    settled = 0
    for c in claims:
        sc = db.get(ClaimScore, c.id)
        if sc and sc.fact_status in ("fact", "lie"):
            settled += 1
    return TopicListItem(
        id=topic.id,
        title=topic.title,
        summary=topic.summary,
        tags=list(topic.tags or []),
        participants=topic.participant_count,
        updatedAt=topic.updated_at,
        claimCount=len(claims),
        settledCount=settled,
    )


def claim_summary(db: Session, claim: Claim, uid: UUID | None) -> ClaimSummary:
    score = db.get(ClaimScore, claim.id)
    if not score:
        score = recompute_claim(db, claim.id)
        db.commit()
    return ClaimSummary(
        id=claim.id,
        text=claim.text,
        scores=scores_dto(db, claim.id, score, uid),
    )


def evidence_dto(db: Session, row: Evidence) -> EvidenceDto:
    trust = db.query(EvidenceTrust).filter(EvidenceTrust.evidence_id == row.id).count()
    return EvidenceDto(
        id=row.id,
        title=row.title,
        url=row.url or "",
        stance=row.stance,
        summary=row.summary,
        trust=trust,
        ogTitle=row.og_title,
        ogSiteName=row.og_site_name,
        ogImageUrl=row.og_image_url,
        previewStatus=row.preview_status,
        archiveUrl=row.archive_url,
        archiveStatus=row.archive_status,
    )


def comment_dto(row: Comment, author: User) -> CommentDto:
    vote = None
    if row.linked_vote is True:
        vote = "true"
    elif row.linked_vote is False:
        vote = "false"
    return CommentDto(
        id=row.id,
        author=author.display_name,
        body=row.body,
        vote=vote,
        at=row.created_at,
    )


def topic_detail(db: Session, topic: Topic, uid: UUID | None) -> TopicDetailOut:
    item = topic_list_item(db, topic)
    claims = [
        claim_summary(db, c, uid)
        for c in topic.claims
        if not c.hidden_at
    ]
    return TopicDetailOut(topic=item, claims=claims)


def claim_detail(db: Session, claim: Claim, uid: UUID | None) -> ClaimDetailOut:
    evidence = db.query(Evidence).filter(Evidence.claim_id == claim.id).all()
    comments = (
        db.query(Comment, User)
        .join(User, User.id == Comment.user_id)
        .filter(Comment.claim_id == claim.id, Comment.hidden_at.is_(None))
        .order_by(Comment.created_at.desc())
        .all()
    )
    return ClaimDetailOut(
        topicId=claim.topic_id,
        claim=claim_summary(db, claim, uid),
        evidence=[evidence_dto(db, e) for e in evidence],
        comments=[comment_dto(c, u) for c, u in comments],
    )

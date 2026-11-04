import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Claim,
    ClaimScore,
    ClaimScoreHistory,
    Comment,
    Evidence,
    EvidenceTrust,
    Topic,
    Vote,
)
from app.scoring.fact_score import fact_score
from app.scoring.opinion import opinion_score
from app.scoring.types import EvidenceInput


def evidence_to_input(row: Evidence, trust: int) -> EvidenceInput:
    inp: EvidenceInput = {
        "id": str(row.id),
        "stance": row.stance,  # type: ignore[typeddict-item]
        "trust": trust,
    }
    if row.url:
        inp["url"] = row.url
    elif row.file_mime:
        inp["fileId"] = str(row.id)
        inp["fileScanStatus"] = row.scan_status or "pending"  # type: ignore[typeddict-item]
    return inp


def load_evidence_inputs(db: Session, claim_id: uuid.UUID) -> list[EvidenceInput]:
    rows = db.scalars(select(Evidence).where(Evidence.claim_id == claim_id, Evidence.status == "active"))
    out: list[EvidenceInput] = []
    for row in rows:
        trust = db.scalar(
            select(func.count()).select_from(EvidenceTrust).where(EvidenceTrust.evidence_id == row.id)
        )
        out.append(evidence_to_input(row, int(trust or 0)))
    return out


def count_votes(db: Session, claim_id: uuid.UUID) -> tuple[int, int]:
    votes = db.scalars(select(Vote).where(Vote.claim_id == claim_id))
    vt, vf = 0, 0
    for v in votes:
        if v.value:
            vt += 1
        else:
            vf += 1
    return vt, vf


def recompute_claim(db: Session, claim_id: uuid.UUID) -> ClaimScore:
    db.flush()
    votes_true, votes_false = count_votes(db, claim_id)
    op = opinion_score(votes_true, votes_false)
    fact = fact_score(load_evidence_inputs(db, claim_id))

    score = db.get(ClaimScore, claim_id)
    if not score:
        score = ClaimScore(claim_id=claim_id, rule_version=fact["ruleVersion"])
        db.add(score)

    score.opinion_pct = int(op["pct"])
    score.votes_true = votes_true
    score.votes_false = votes_false
    score.fact_status = fact["status"]
    score.fact_pct = fact["factPct"]
    score.w_true = fact["wTrue"]
    score.w_false = fact["wFalse"]
    score.eligible_true = fact["eligibleTrue"]
    score.eligible_false = fact["eligibleFalse"]
    score.gate_reasons = fact["reasons"]
    score.gate_passed = fact["gatePassed"]
    score.rule_version = fact["ruleVersion"]
    score.computed_at = datetime.now(timezone.utc)

    history = ClaimScoreHistory(
        claim_id=claim_id,
        opinion_pct=score.opinion_pct,
        votes_true=votes_true,
        votes_false=votes_false,
        fact_status=fact["status"],
        fact_pct=fact["factPct"],
        w_true=fact["wTrue"],
        w_false=fact["wFalse"],
        eligible_true=fact["eligibleTrue"],
        eligible_false=fact["eligibleFalse"],
        gate_passed=fact["gatePassed"],
        gate_reasons=fact["reasons"],
        rule_version=fact["ruleVersion"],
    )
    db.add(history)
    db.flush()
    return score


def touch_topic_activity(db: Session, topic_id: uuid.UUID) -> None:
    topic = db.get(Topic, topic_id)
    if topic:
        topic.updated_at = datetime.now(timezone.utc)


def user_vote(db: Session, claim_id: uuid.UUID, user_id: uuid.UUID) -> str | None:
    vote = db.get(Vote, (claim_id, user_id))
    if not vote:
        return None
    return "true" if vote.value else "false"

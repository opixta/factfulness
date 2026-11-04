"""Load fixtures/seed.json into Postgres (slug IDs → deterministic UUIDs)."""
from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import Claim, Evidence, EvidenceTrust, Topic, User, Vote, slug_uuid
from app.services.recompute import recompute_claim

REPO_ROOT = Path(__file__).resolve().parents[3]
SEED_PATH = REPO_ROOT / "fixtures" / "seed.json"


def _ensure_user(db: Session, external_id: str, display_name: str) -> User:
    user = db.query(User).filter(User.external_id == external_id).one_or_none()
    if user:
        return user
    user = User(external_id=external_id, display_name=display_name)
    db.add(user)
    db.flush()
    return user


def _seed_votes(db: Session, claim_id, claim_slug: str, votes_true: int, votes_false: int) -> None:
    for i in range(votes_true):
        u = _ensure_user(db, f"seed-vote-true-{claim_slug}-{i}", f"vt_{claim_slug}_{i}")
        db.add(Vote(claim_id=claim_id, user_id=u.id, value=True))
    for i in range(votes_false):
        u = _ensure_user(db, f"seed-vote-false-{claim_slug}-{i}", f"vf_{claim_slug}_{i}")
        db.add(Vote(claim_id=claim_id, user_id=u.id, value=False))


def load_seed(db: Session, data: dict) -> None:
    dev = _ensure_user(db, "seed-system", "seed")

    for t in data["topics"]:
        tid = slug_uuid(t["slug"])
        topic = Topic(
            id=tid,
            title=t["title"],
            summary=t["summary"],
            tags=t.get("tags", []),
            participant_count=t.get("participants", 0),
            created_by=dev.id,
        )
        db.add(topic)

    db.flush()

    for topic_slug, claims in data["claims"].items():
        topic_id = slug_uuid(topic_slug)
        for c in claims:
            cid = slug_uuid(c["slug"])
            claim = Claim(
                id=cid,
                topic_id=topic_id,
                text=c["text"],
                reason=c.get("reason"),
                created_by=dev.id,
            )
            db.add(claim)
            db.flush()
            for e in data.get("evidence", {}).get(c["slug"], []):
                eid = slug_uuid(e["slug"])
                ev = Evidence(
                    id=eid,
                    claim_id=cid,
                    user_id=dev.id,
                    title=e["title"],
                    url=e.get("url"),
                    stance=e["stance"],
                    summary=e["summary"],
                    og_title=e.get("ogTitle") or e.get("title"),
                    og_site_name=e.get("ogSiteName"),
                    og_image_url=e.get("ogImageUrl"),
                    preview_status=e.get("previewStatus"),
                )
                db.add(ev)
            db.flush()
            for e in data.get("evidence", {}).get(c["slug"], []):
                eid = slug_uuid(e["slug"])
                for i in range(int(e.get("trust", 0))):
                    u = _ensure_user(
                        db,
                        f"seed-trust-{e['slug']}-{i}",
                        f"tr_{e['slug']}_{i}",
                    )
                    db.add(EvidenceTrust(evidence_id=eid, user_id=u.id))
            _seed_votes(
                db,
                cid,
                c["slug"],
                int(c.get("votesTrue", 0)),
                int(c.get("votesFalse", 0)),
            )
            recompute_claim(db, cid)


def load_seed_from_file(db: Session, path: Path = SEED_PATH) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    load_seed(db, data)

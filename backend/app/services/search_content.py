"""Title search (topic title + claim text) with hidden exclusion and cursor pagination."""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.models import Claim, Topic
from app.schemas.dto import SearchHitOut
from app.services.search_query import ilike_pattern, normalize_search_query


def _parse_cursor(cursor: str | None) -> str | None:
    if not cursor:
        return None
    try:
        kind, raw_id = cursor.split(":", 1)
        if kind not in ("topic", "claim"):
            return None
        uuid.UUID(raw_id)
        return cursor
    except (ValueError, AttributeError):
        return None


def _cursor_for_hit(hit: SearchHitOut) -> str:
    if hit.type == "claim" and hit.claimId:
        return f"claim:{hit.claimId}"
    return f"topic:{hit.topicId}"


def _collect_hits(db: Session, normalized: str) -> list[SearchHitOut]:
    pattern = ilike_pattern(normalized)
    hits: list[SearchHitOut] = []
    seen_claims: set[uuid.UUID] = set()

    topics = (
        db.query(Topic)
        .filter(Topic.hidden_at.is_(None))
        .order_by(Topic.updated_at.desc(), Topic.id)
        .all()
    )
    for topic in topics:
        topic_matches = (
            db.query(Topic.id)
            .filter(Topic.id == topic.id, Topic.title.ilike(pattern, escape="\\"))
            .first()
            is not None
        )
        if topic_matches:
            hits.append(
                SearchHitOut(type="topic", topicId=topic.id, title=topic.title, snippet=None)
            )

        claims = (
            db.query(Claim)
            .filter(Claim.topic_id == topic.id, Claim.hidden_at.is_(None))
            .filter(Claim.text.ilike(pattern, escape="\\"))
            .order_by(Claim.created_at.desc(), Claim.id)
            .all()
        )
        for claim in claims:
            if claim.id in seen_claims:
                continue
            seen_claims.add(claim.id)
            hits.append(
                SearchHitOut(
                    type="claim",
                    topicId=topic.id,
                    claimId=claim.id,
                    title=claim.text,
                )
            )
    return hits


def search_title_hits(
    db: Session,
    query: str,
    *,
    limit: int = 30,
    cursor: str | None = None,
) -> tuple[list[SearchHitOut], str | None]:
    if limit < 1 or limit > 50:
        limit = 30
    normalized = normalize_search_query(query)
    if not normalized:
        return [], None

    all_hits = _collect_hits(db, normalized)
    start = 0
    parsed = _parse_cursor(cursor)
    if parsed:
        for i, hit in enumerate(all_hits):
            if _cursor_for_hit(hit) == parsed:
                start = i + 1
                break

    page = all_hits[start : start + limit]
    has_more = start + limit < len(all_hits)
    next_cursor = _cursor_for_hit(page[-1]) if page and has_more else None
    return page, next_cursor

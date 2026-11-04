import uuid

from app.models import Claim, Topic, slug_uuid
from app.services.seed_data import load_seed_from_file


def test_search_topics(client, db_session):
    load_seed_from_file(db_session)
    db_session.commit()
    r = client.get("/v1/search", params={"q": "OECD"})
    assert r.status_code == 200
    body = r.json()
    hits = body["hits"]
    assert body.get("nextCursor") is None or isinstance(body["nextCursor"], str)
    assert any(h["type"] == "claim" for h in hits)


def test_search_korean_title(client, db_session):
    topic_id = uuid.uuid4()
    db_session.add(
        Topic(
            id=topic_id,
            title="한국 경제 성장률",
            summary="s",
            tags=[],
            status="open",
            participant_count=1,
        )
    )
    db_session.commit()
    r = client.get("/v1/search", params={"q": "경제"})
    assert r.status_code == 200
    hits = r.json()["hits"]
    assert any(h["type"] == "topic" and h["topicId"] == str(topic_id) for h in hits)


def test_search_excludes_hidden(client, db_session):
    load_seed_from_file(db_session)
    claim_id = slug_uuid("c2")
    claim = db_session.get(Claim, claim_id)
    assert claim is not None
    claim.hidden_at = claim.created_at
    db_session.commit()
    r = client.get("/v1/search", params={"q": "OECD"})
    assert r.status_code == 200
    hits = r.json()["hits"]
    assert not any(h.get("claimId") == str(claim_id) for h in hits)


def test_search_pagination(client, db_session):
    for i in range(5):
        db_session.add(
            Topic(
                id=uuid.uuid4(),
                title=f"Pagination topic {i} alpha",
                summary="s",
                tags=[],
                status="open",
                participant_count=0,
            )
        )
    db_session.commit()
    r1 = client.get("/v1/search", params={"q": "pagination", "limit": 2})
    assert r1.status_code == 200
    body1 = r1.json()
    assert len(body1["hits"]) == 2
    assert body1["nextCursor"]
    r2 = client.get(
        "/v1/search",
        params={"q": "pagination", "limit": 2, "cursor": body1["nextCursor"]},
    )
    assert r2.status_code == 200
    body2 = r2.json()
    assert len(body2["hits"]) >= 1
    ids1 = {(h["type"], h.get("claimId") or h["topicId"]) for h in body1["hits"]}
    ids2 = {(h["type"], h.get("claimId") or h["topicId"]) for h in body2["hits"]}
    assert ids1.isdisjoint(ids2)

import json

from app.models import User, slug_uuid
from app.services.seed_data import SEED_PATH, load_seed

REPO_ROOT = SEED_PATH.parents[0]


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_scoring_config(client):
    r = client.get("/config/scoring")
    assert r.status_code == 200
    body = r.json()
    assert body["ruleVersion"] == "2026-11-04-v3"


def test_topics_and_claims_after_seed(client, db_session):
    data = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    load_seed(db_session, data)
    db_session.commit()

    r = client.get("/v1/topics")
    assert r.status_code == 200
    topics = r.json()["topics"]
    assert len(topics) >= 2

    c1_id = slug_uuid("c1")
    r2 = client.get(f"/v1/claims/{c1_id}")
    assert r2.status_code == 200
    claim = r2.json()["claim"]
    assert claim["scores"]["fact"]["status"] == "lie"
    assert claim["scores"]["votesTrue"] == 41
    assert claim["scores"]["votesFalse"] == 67

    c3_id = slug_uuid("c3")
    r3 = client.get(f"/v1/claims/{c3_id}")
    assert r3.json()["claim"]["scores"]["fact"]["status"] == "pending"


def test_create_topic_dev_auth(client, db_session):
    db_session.add(User(external_id="dev-local-user", display_name="dev"))
    db_session.commit()

    r = client.post(
        "/v1/topics",
        json={
            "title": "Test topic",
            "summary": "Summary",
            "firstClaimText": "First claim text here",
        },
    )
    assert r.status_code == 201
    assert "topic" in r.json()

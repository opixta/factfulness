import json
import uuid

from app.models import slug_uuid
from app.services.seed_data import load_seed_from_file


def test_search_topics(client, db_session):
    load_seed_from_file(db_session)
    db_session.commit()
    r = client.get("/v1/search", params={"q": "OECD"})
    assert r.status_code == 200
    hits = r.json()["hits"]
    assert any(h["type"] == "claim" for h in hits)


def test_bootstrap(client, db_session):
    load_seed_from_file(db_session)
    db_session.commit()
    r = client.get("/v1/bootstrap")
    assert r.status_code == 200
    body = r.json()
    assert len(body["topics"]) >= 2
    c1 = slug_uuid("c1")
    assert str(c1) in body["evidence"]


def test_notification_prefs(client, db_session):
    from app.models import User

    db_session.add(User(external_id="dev-local-user", display_name="dev"))
    db_session.commit()
    headers = {
        "X-Dev-User-External-Id": "dev-local-user",
        "X-Dev-Display-Name": "dev",
    }
    r = client.put(
        "/v1/users/me/notification-prefs",
        headers=headers,
        json={"notifyVerdictChange": False},
    )
    assert r.status_code == 200
    assert r.json()["notifyVerdictChange"] is False


def test_content_report_auto_hide(client, db_session):
    load_seed_from_file(db_session)
    db_session.commit()
    claim_id = slug_uuid("c2")
    for i in range(3):
        headers = {
            "X-Dev-User-External-Id": f"reporter-{i}",
            "X-Dev-Display-Name": f"rep{i}",
        }
        r = client.post(
            "/v1/content/report",
            headers=headers,
            json={"targetType": "claim", "targetId": str(claim_id)},
        )
        assert r.status_code == 200
    final = r.json()
    assert final["distinctReports"] == 3
    assert final["hidden"] is True
    r2 = client.get(f"/v1/claims/{claim_id}")
    assert r2.status_code == 404

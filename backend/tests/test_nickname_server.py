import uuid
from datetime import datetime, timezone

from app.models import User
from app.services.user_profile import user_profile_out


def test_get_me_nickname_not_confirmed_until_patch(client, db_session):
    db_session.add(
        User(
            external_id="dev-local-user",
            display_name="dev",
            nickname_confirmed_at=datetime.now(timezone.utc),
        )
    )
    db_session.commit()
    headers = {
        "X-Dev-User-External-Id": "new-user-1",
        "X-Dev-Display-Name": "placeholder",
    }
    r = client.get("/v1/users/me", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["nicknameConfirmed"] is False
    assert body["displayName"] == "placeholder"

    r2 = client.patch(
        "/v1/users/me",
        headers=headers,
        json={"displayName": "my_nick"},
    )
    assert r2.status_code == 200
    assert r2.json()["nicknameConfirmed"] is True

    user = db_session.query(User).filter(User.external_id == "new-user-1").one()
    assert user.nickname_confirmed_at is not None


def test_bootstrap_includes_me_when_authenticated(client, db_session):
    db_session.add(
        User(
            external_id="dev-local-user",
            display_name="dev",
            nickname_confirmed_at=datetime.now(timezone.utc),
        )
    )
    db_session.commit()
    headers = {
        "X-Dev-User-External-Id": "dev-local-user",
        "X-Dev-Display-Name": "dev",
    }
    r = client.get("/v1/bootstrap", headers=headers)
    assert r.status_code == 200
    me = r.json()["me"]
    assert me["externalId"] == "dev-local-user"
    assert me["nicknameConfirmed"] is True

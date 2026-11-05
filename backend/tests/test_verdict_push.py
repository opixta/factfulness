import uuid
from datetime import datetime, timezone

from app.models import Claim, ClaimScore, PushToken, Topic, User, Vote
from app.services.expo_push import PushTicket, get_fake_push_sender
from app.services.recompute import recompute_claim
from app.services.verdict_push import notify_verdict_change


def _seed_claim_with_voter(db_session):
    topic_id = uuid.uuid4()
    claim_id = uuid.uuid4()
    user = User(
        external_id="voter-push-1",
        display_name="voter1",
        nickname_confirmed_at=datetime.now(timezone.utc),
        notify_verdict_change=True,
    )
    db_session.add(user)
    db_session.add(
        Topic(id=topic_id, title="t", summary="s", tags=[], status="open", participant_count=0)
    )
    db_session.add(Claim(id=claim_id, topic_id=topic_id, text="한국 경제 성장률 명제"))
    db_session.flush()
    db_session.add(Vote(claim_id=claim_id, user_id=user.id, value=True))
    db_session.add(
        PushToken(
            user_id=user.id,
            expo_token="ExponentPushToken[test-push]",
            platform="ios",
        )
    )
    db_session.commit()
    return claim_id, user.id


def test_notify_verdict_change_sends_expo_message(db_session, monkeypatch):
    monkeypatch.setattr("app.config.settings.push_sender", "fake")
    fake = get_fake_push_sender()
    fake.sent.clear()

    claim_id, _ = _seed_claim_with_voter(db_session)
    notify_verdict_change(db_session, claim_id, "pending", "fact")
    db_session.commit()

    assert len(fake.sent) == 1
    msg = fake.sent[0]
    assert msg.to == "ExponentPushToken[test-push]"
    assert msg.data["claimId"] == str(claim_id)
    assert "Fact" in msg.body
    assert "경제" in msg.body


def test_verdict_push_skipped_when_pref_off(db_session, monkeypatch):
    monkeypatch.setattr("app.config.settings.push_sender", "fake")
    fake = get_fake_push_sender()
    fake.sent.clear()

    claim_id, user_id = _seed_claim_with_voter(db_session)
    user = db_session.get(User, user_id)
    assert user
    user.notify_verdict_change = False
    db_session.commit()

    notify_verdict_change(db_session, claim_id, "pending", "fact")
    assert fake.sent == []


def test_device_not_registered_clears_token(db_session, monkeypatch):
    monkeypatch.setattr("app.config.settings.push_sender", "fake")
    fake = get_fake_push_sender()
    fake.sent.clear()
    fake.responses = [PushTicket(status="error", details={"error": "DeviceNotRegistered"})]

    claim_id, user_id = _seed_claim_with_voter(db_session)
    notify_verdict_change(db_session, claim_id, "pending", "lie")
    db_session.commit()

    assert db_session.query(PushToken).filter(PushToken.user_id == user_id).count() == 0


def test_recompute_triggers_push_on_status_change(db_session, monkeypatch):
    monkeypatch.setattr("app.config.settings.push_sender", "fake")
    fake = get_fake_push_sender()
    fake.sent.clear()

    claim_id, _ = _seed_claim_with_voter(db_session)
    db_session.add(
        ClaimScore(claim_id=claim_id, fact_status="pending", rule_version="2026-11-04-v3")
    )
    db_session.commit()

    fake_fact = {
        "status": "fact",
        "factPct": 80,
        "wTrue": 3,
        "wFalse": 0,
        "eligibleTrue": 2,
        "eligibleFalse": 0,
        "gatePassed": True,
        "reasons": [],
        "ruleVersion": "2026-11-04-v3",
    }
    monkeypatch.setattr("app.services.recompute.fact_score", lambda _ev: fake_fact)

    recompute_claim(db_session, claim_id)
    db_session.commit()

    assert len(fake.sent) == 1

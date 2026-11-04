import time
import uuid

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm

from app.auth.supabase_jwt import AuthTokenError, configure_jwks_for_tests, decode_supabase_access_token
from app.config import settings


def _rsa_pair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_key = private_key.public_key()
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return private_pem, public_pem


@pytest.fixture
def issuer(monkeypatch):
    monkeypatch.setattr(settings, "supabase_url", "https://testproject.supabase.co")
    return "https://testproject.supabase.co/auth/v1"


def test_hs256_legacy_secret(monkeypatch, issuer):
    monkeypatch.setattr(settings, "supabase_jwt_secret", "test-secret-for-hs256")
    configure_jwks_for_tests(None, None)
    token = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "aud": "authenticated",
            "iss": issuer,
            "exp": int(time.time()) + 3600,
            "email": "alice@example.com",
        },
        "test-secret-for-hs256",
        algorithm="HS256",
    )
    claims = decode_supabase_access_token(token)
    assert claims["aud"] == "authenticated"
    assert claims["email"] == "alice@example.com"


def test_rs256_via_jwks_client(monkeypatch, issuer):
    monkeypatch.setattr(settings, "supabase_jwt_secret", "")
    private_pem, public_pem = _rsa_pair()

    class MockJWKClient:
        def get_signing_key_from_jwt(self, _token: str):
            class SK:
                key = public_pem

            return SK()

    configure_jwks_for_tests("https://example.com/jwks.json", MockJWKClient())  # type: ignore[arg-type]

    sub = str(uuid.uuid4())
    token = jwt.encode(
        {
            "sub": sub,
            "aud": "authenticated",
            "iss": issuer,
            "exp": int(time.time()) + 3600,
        },
        private_pem,
        algorithm="RS256",
        headers={"kid": "test-kid"},
    )
    claims = decode_supabase_access_token(token)
    assert claims["sub"] == sub


def test_expired_token_rejected(monkeypatch, issuer):
    monkeypatch.setattr(settings, "supabase_jwt_secret", "s")
    configure_jwks_for_tests(None, None)
    token = jwt.encode(
        {
            "sub": "x",
            "aud": "authenticated",
            "iss": issuer,
            "exp": int(time.time()) - 10,
        },
        "s",
        algorithm="HS256",
    )
    with pytest.raises(AuthTokenError):
        decode_supabase_access_token(token)


def test_deps_upsert_user(client, db_session, monkeypatch, issuer):
    from app.models import User

    monkeypatch.setattr(settings, "auth_mode", "supabase")
    monkeypatch.setattr(settings, "supabase_jwt_secret", "integration-secret")
    configure_jwks_for_tests(None, None)
    sub = str(uuid.uuid4())
    token = jwt.encode(
        {
            "sub": sub,
            "aud": "authenticated",
            "iss": issuer,
            "exp": int(time.time()) + 3600,
        },
        "integration-secret",
        algorithm="HS256",
    )
    r = client.get("/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    user = db_session.query(User).filter(User.external_id == sub).one()
    assert user.display_name

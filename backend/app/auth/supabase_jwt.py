"""Verify Supabase Auth JWTs (JWKS RS*/ES* and legacy HS256)."""
from __future__ import annotations

import time
from typing import Any

import jwt
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError

from app.config import settings

_jwks_client: PyJWKClient | None = None
_jwks_url_override: str | None = None
_jwks_client_override: PyJWKClient | None = None


class AuthTokenError(Exception):
    """Raised when a bearer token fails validation."""


def _issuer() -> str:
    base = settings.supabase_url.rstrip("/")
    if not base:
        raise AuthTokenError("SUPABASE_URL not configured")
    return f"{base}/auth/v1"


def configure_jwks_for_tests(jwks_url: str | None, client: PyJWKClient | None = None) -> None:
    global _jwks_url_override, _jwks_client_override, _jwks_client
    _jwks_url_override = jwks_url
    _jwks_client_override = client
    _jwks_client = None


def _jwks_client_instance() -> PyJWKClient | None:
    global _jwks_client
    if _jwks_client_override is not None:
        return _jwks_client_override
    if not settings.supabase_url:
        return None
    jwks_url = _jwks_url_override or (
        settings.supabase_url.rstrip("/") + "/auth/v1/.well-known/jwks.json"
    )
    if _jwks_client is None:
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True, lifespan=600)
    return _jwks_client


def decode_supabase_access_token(token: str) -> dict[str, Any]:
    """Validate and return JWT claims."""
    try:
        header = jwt.get_unverified_header(token)
    except InvalidTokenError as exc:
        raise AuthTokenError("Invalid token header") from exc

    alg = header.get("alg", "")
    issuer = None
    try:
        issuer = _issuer()
    except AuthTokenError:
        issuer = None

    decode_kwargs: dict[str, Any] = {
        "audience": "authenticated",
        "options": {"require": ["exp", "sub"]},
    }
    if issuer:
        decode_kwargs["issuer"] = issuer

    try:
        if alg == "HS256" or (not alg.startswith("RS") and not alg.startswith("ES")):
            secret = settings.supabase_jwt_secret
            if not secret:
                raise AuthTokenError("HS256 token but SUPABASE_JWT_SECRET not set")
            return jwt.decode(token, secret, algorithms=["HS256"], **decode_kwargs)

        client = _jwks_client_instance()
        if not client:
            raise AuthTokenError("Asymmetric JWT but SUPABASE_URL not configured")
        key = client.get_signing_key_from_jwt(token)
        algs = [alg] if alg else ["RS256", "ES256"]
        return jwt.decode(token, key.key, algorithms=algs, **decode_kwargs)
    except InvalidTokenError as exc:
        raise AuthTokenError("Invalid or expired token") from exc
    except AuthTokenError:
        raise
    except Exception as exc:
        raise AuthTokenError("Token verification failed") from exc

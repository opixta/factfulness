from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.supabase_jwt import AuthTokenError, decode_supabase_access_token
from app.config import settings
from app.db import get_db
from app.models import User

security = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
    user: User


def _auth_http_401(detail: str = "AUTH_INVALID") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _get_or_create_user(db: Session, external_id: str, display_name: str) -> User:
    user = db.query(User).filter(User.external_id == external_id).one_or_none()
    if user:
        return user
    user = User(external_id=external_id, display_name=display_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _upsert_user_from_claims(db: Session, claims: dict) -> User:
    sub = claims.get("sub")
    if not sub:
        raise _auth_http_401()
    email = claims.get("email")
    if isinstance(email, str) and email:
        placeholder = email.split("@")[0][:20]
    else:
        placeholder = str(sub).replace("-", "")[:20] or "user"
    user = db.query(User).filter(User.external_id == sub).one_or_none()
    if user:
        return user
    return _get_or_create_user(db, sub, placeholder)


def _get_or_create_dev_user(db: Session) -> User:
    return _get_or_create_user(
        db, settings.dev_user_external_id, settings.dev_user_display_name
    )


def _resolve_dev_user(
    db: Session,
    dev_user_id: str | None,
    dev_display_name: str | None,
) -> User:
    if dev_user_id and dev_display_name:
        name = dev_display_name.strip()
        if not name:
            return _get_or_create_dev_user(db)
        user = db.query(User).filter(User.external_id == dev_user_id.strip()).one_or_none()
        if user:
            if user.display_name != name:
                user.display_name = name
                db.commit()
                db.refresh(user)
            return user
        return _get_or_create_user(db, dev_user_id.strip(), name)
    return _get_or_create_dev_user(db)


def _user_from_bearer(db: Session, token: str) -> User:
    try:
        claims = decode_supabase_access_token(token)
    except AuthTokenError as exc:
        raise _auth_http_401(str(exc) if str(exc) else "AUTH_INVALID") from exc
    return _upsert_user_from_claims(db, claims)


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    dev_user_id: Annotated[str | None, Header(alias="X-Dev-User-External-Id")] = None,
    dev_display_name: Annotated[str | None, Header(alias="X-Dev-Display-Name")] = None,
) -> CurrentUser:
    if settings.auth_mode == "dev":
        return CurrentUser(user=_resolve_dev_user(db, dev_user_id, dev_display_name))
    if not creds or creds.scheme.lower() != "bearer":
        raise _auth_http_401("AUTH_REQUIRED")
    return CurrentUser(user=_user_from_bearer(db, creds.credentials))


def get_optional_user(
    db: Annotated[Session, Depends(get_db)],
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    dev_user_id: Annotated[str | None, Header(alias="X-Dev-User-External-Id")] = None,
    dev_display_name: Annotated[str | None, Header(alias="X-Dev-Display-Name")] = None,
) -> CurrentUser | None:
    if settings.auth_mode == "dev":
        if dev_user_id and dev_display_name:
            return CurrentUser(user=_resolve_dev_user(db, dev_user_id, dev_display_name))
        return None
    if not creds or creds.scheme.lower() != "bearer":
        return None
    try:
        return CurrentUser(user=_user_from_bearer(db, creds.credentials))
    except HTTPException:
        return None

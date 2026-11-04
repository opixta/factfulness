from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import User

security = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
    user: User


def _get_or_create_dev_user(db: Session) -> User:
    user = db.query(User).filter(User.external_id == settings.dev_user_external_id).one_or_none()
    if user:
        return user
    user = User(
        external_id=settings.dev_user_external_id,
        display_name=settings.dev_user_display_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _user_from_supabase_token(db: Session, token: str) -> User:
    if not settings.supabase_jwt_secret:
        raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, detail="Supabase JWT not configured")
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.external_id == sub).one_or_none()
    if not user:
        name = payload.get("email") or sub[:20]
        user = User(external_id=sub, display_name=name)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> CurrentUser:
    if settings.auth_mode == "dev":
        return CurrentUser(user=_get_or_create_dev_user(db))
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Authorization required")
    user = _user_from_supabase_token(db, creds.credentials)
    return CurrentUser(user=user)


def get_optional_user(
    db: Annotated[Session, Depends(get_db)],
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> CurrentUser | None:
    if settings.auth_mode == "dev":
        return CurrentUser(user=_get_or_create_dev_user(db))
    if not creds:
        return None
    try:
        return CurrentUser(user=_user_from_supabase_token(db, creds.credentials))
    except HTTPException:
        return None

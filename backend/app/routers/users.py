import uuid

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import CurrentUser, get_current_user
from app.models import PushToken, User
from app.schemas.dto import (
    NotificationPrefsIn,
    NotificationPrefsOut,
    PushTokenIn,
    UserProfileIn,
    UserProfileOut,
)
from app.services.user_profile import user_profile_out

router = APIRouter(prefix="/users/me", tags=["users"])


@router.get("", response_model=UserProfileOut)
def get_profile(auth: CurrentUser = Depends(get_current_user)) -> UserProfileOut:
    return user_profile_out(auth.user)


@router.patch("", response_model=UserProfileOut)
def update_profile(
    body: UserProfileIn,
    db: Session = Depends(get_db),
    auth: CurrentUser = Depends(get_current_user),
) -> UserProfileOut:
    name = body.displayName.strip()
    u = auth.user
    if u.display_name == name and u.nickname_confirmed_at is not None:
        return user_profile_out(u)
    u.display_name = name
    if u.nickname_confirmed_at is None:
        u.nickname_confirmed_at = datetime.now(timezone.utc)
    try:
        db.commit()
        db.refresh(u)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail="NICKNAME_TAKEN") from exc
    return user_profile_out(u)


@router.get("/notification-prefs", response_model=NotificationPrefsOut)
def get_notification_prefs(auth: CurrentUser = Depends(get_current_user)) -> NotificationPrefsOut:
    return NotificationPrefsOut(notifyVerdictChange=auth.user.notify_verdict_change)


@router.put("/notification-prefs", response_model=NotificationPrefsOut)
def put_notification_prefs(
    body: NotificationPrefsIn,
    db: Session = Depends(get_db),
    auth: CurrentUser = Depends(get_current_user),
) -> NotificationPrefsOut:
    auth.user.notify_verdict_change = body.notifyVerdictChange
    db.commit()
    return NotificationPrefsOut(notifyVerdictChange=auth.user.notify_verdict_change)


@router.post("/push-token", status_code=status.HTTP_204_NO_CONTENT)
def upsert_push_token(
    body: PushTokenIn,
    db: Session = Depends(get_db),
    auth: CurrentUser = Depends(get_current_user),
) -> None:
    row = db.get(PushToken, (auth.user.id, body.expoToken))
    if row:
        row.platform = body.platform
    else:
        db.add(
            PushToken(
                user_id=auth.user.id,
                expo_token=body.expoToken,
                platform=body.platform,
            )
        )
    db.commit()


@router.delete("/push-token", status_code=status.HTTP_204_NO_CONTENT)
def clear_push_tokens(
    db: Session = Depends(get_db),
    auth: CurrentUser = Depends(get_current_user),
) -> None:
    db.query(PushToken).filter(PushToken.user_id == auth.user.id).delete()
    db.commit()

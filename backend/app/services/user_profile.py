from app.models import User
from app.schemas.dto import UserProfileOut


def user_profile_out(user: User) -> UserProfileOut:
    return UserProfileOut(
        externalId=user.external_id,
        displayName=user.display_name,
        nicknameConfirmed=user.nickname_confirmed_at is not None,
    )

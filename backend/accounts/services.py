from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.db import IntegrityError, transaction

from .models import Profile


class ProfileValidationError(Exception):
    def __init__(self, errors):
        self.errors = errors
        super().__init__(errors)


def serialize_user(user):
    profile = user.profile
    return {
        "id": str(user.id),
        "email": user.email,
        "displayName": profile.display_name,
        "username": profile.username or "",
        "avatarUrl": profile.avatar_url,
        "bio": profile.bio,
    }


def update_profile_for_user(user, updates):
    profile = user.profile

    if "display_name" in updates:
        display_name = (updates["display_name"] or "").strip()
        if not display_name:
            raise ProfileValidationError(
                {"display_name": "Display name is required."}
            )
        profile.display_name = display_name

    if "username" in updates:
        username = (updates["username"] or "").strip()
        if username and _username_exists_for_another_profile(username, profile):
            raise ProfileValidationError(
                {"username": "This username is already in use."}
            )
        profile.username = username or None

    if "avatar_url" in updates:
        avatar_url = (updates["avatar_url"] or "").strip()
        if avatar_url:
            try:
                URLValidator()(avatar_url)
            except ValidationError as exc:
                raise ProfileValidationError(
                    {"avatar_url": "Avatar URL must be valid."}
                ) from exc
        profile.avatar_url = avatar_url

    if "bio" in updates:
        profile.bio = (updates["bio"] or "").strip()

    try:
        with transaction.atomic():
            profile.save()
    except IntegrityError as exc:
        raise ProfileValidationError(
            {"username": "This username is already in use."}
        ) from exc

    return serialize_user(user)


def _username_exists_for_another_profile(username, profile):
    return Profile.objects.filter(username=username).exclude(pk=profile.pk).exists()

from django.contrib.auth import get_user_model
from django.http import JsonResponse
from ninja import Router

from social.models import Follow

social_router = Router(tags=["social"])
User = get_user_model()


def auth_required(request):
    if request.user.is_authenticated:
        return None
    return JsonResponse({"detail": "Authentication required."}, status=401)


def serialize_user_summary(user):
    profile = user.profile
    return {
        "id": str(user.id),
        "displayName": profile.display_name,
        "username": profile.username or "",
        "avatarUrl": profile.avatar_url,
        "bio": profile.bio,
    }


@social_router.get("/following")
def list_following_view(request):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    follows = (
        Follow.objects.filter(follower=request.user)
        .select_related("following", "following__profile")
        .order_by("-created_at")
    )
    return {"items": [serialize_user_summary(follow.following) for follow in follows]}


@social_router.post("/following/{user_id}")
def follow_user_view(request, user_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    if request.user.id == user_id:
        return JsonResponse({"detail": "You cannot follow yourself."}, status=422)

    try:
        user_to_follow = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"detail": "User not found."}, status=404)

    Follow.objects.get_or_create(follower=request.user, following=user_to_follow)
    return {"following": serialize_user_summary(user_to_follow)}


@social_router.delete("/following/{user_id}")
def unfollow_user_view(request, user_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    deleted_count, _ = Follow.objects.filter(
        follower=request.user, following_id=user_id
    ).delete()
    return {"ok": True, "removed": deleted_count > 0}

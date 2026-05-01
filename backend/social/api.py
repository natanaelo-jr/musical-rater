from django.contrib.auth import get_user_model
from django.db.models import Q
from django.http import JsonResponse
from ninja import Router

from catalog.models import Rating, SavedAlbum
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


def serialize_user_with_follow_state(user, following_ids):
    return {
        **serialize_user_summary(user),
        "isFollowing": user.id in following_ids,
    }


def serialize_rating_card(rating):
    music = rating.music
    return {
        "id": rating.id,
        "musicId": rating.music_id,
        "score": rating.score,
        "review": rating.review,
        "updatedAt": rating.updated_at.isoformat(),
        "title": music.title,
        "artistName": music.primary_artist.name,
        "albumTitle": music.album.title if music.album_id else "",
        "artworkUrl": music.cover_url,
    }


def serialize_saved_album_card(saved_album):
    album = saved_album.album
    return {
        "id": saved_album.id,
        "albumId": saved_album.album_id,
        "title": album.title,
        "artistName": album.primary_artist.name,
        "artworkUrl": album.cover_url,
        "releaseDate": album.release_date,
    }


@social_router.get("/users")
def search_users_view(request, q: str = ""):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    query = q.strip()
    if len(query) < 2:
        return {"items": []}

    following_ids = set(
        Follow.objects.filter(follower=request.user).values_list(
            "following_id", flat=True
        )
    )
    users = (
        User.objects.select_related("profile")
        .exclude(id=request.user.id)
        .filter(
            Q(email__icontains=query)
            | Q(profile__display_name__icontains=query)
            | Q(profile__username__icontains=query)
        )
        .order_by("profile__display_name", "email")[:10]
    )

    return {
        "items": [
            serialize_user_with_follow_state(user, following_ids) for user in users
        ]
    }


@social_router.get("/users/{user_id}")
def get_public_profile_view(request, user_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    try:
        user = User.objects.select_related("profile").get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"detail": "User not found."}, status=404)

    is_self = request.user.id == user.id
    is_following = (
        False
        if is_self
        else Follow.objects.filter(follower=request.user, following=user).exists()
    )
    ratings = (
        Rating.objects.filter(user=user)
        .select_related("music", "music__primary_artist", "music__album")
        .order_by("-updated_at")[:12]
    )
    saved_albums = (
        SavedAlbum.objects.filter(user=user)
        .select_related("album", "album__primary_artist")
        .order_by("-created_at")[:12]
    )

    return {
        "profile": {
            **serialize_user_summary(user),
            "isSelf": is_self,
            "isFollowing": is_following,
            "stats": {
                "ratings": Rating.objects.filter(user=user).count(),
                "albums": SavedAlbum.objects.filter(user=user).count(),
                "following": Follow.objects.filter(follower=user).count(),
                "followers": Follow.objects.filter(following=user).count(),
            },
        },
        "ratings": [serialize_rating_card(rating) for rating in ratings],
        "savedAlbums": [
            serialize_saved_album_card(saved_album) for saved_album in saved_albums
        ],
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

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from ninja import Router

from catalog.models import AlbumRating, Rating, SavedAlbum
from social.models import Follow, Notification

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
        "kind": "track",
        "id": rating.id,
        "musicId": rating.music_id,
        "albumId": None,
        "score": rating.score,
        "review": rating.review,
        "updatedAt": rating.updated_at.isoformat(),
        "title": music.title,
        "artistName": music.primary_artist.name,
        "albumTitle": music.album.title if music.album_id else "",
        "artworkUrl": music.cover_url,
    }


def serialize_album_rating_card(album_rating):
    album = album_rating.album
    return {
        "kind": "album",
        "id": album_rating.id,
        "musicId": None,
        "albumId": album_rating.album_id,
        "score": album_rating.score,
        "review": album_rating.review,
        "updatedAt": album_rating.updated_at.isoformat(),
        "title": album.title,
        "artistName": album.primary_artist.name,
        "albumTitle": None,
        "artworkUrl": album.cover_url,
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


def serialize_notification(notification):
    return {
        "id": notification.id,
        "kind": notification.kind,
        "read": notification.read_at is not None,
        "createdAt": notification.created_at.isoformat(),
        "actor": serialize_user_summary(notification.actor),
        "ratingId": notification.rating_id,
        "commentId": notification.comment_id,
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
    track_ratings = list(
        Rating.objects.filter(user=user)
        .select_related("music", "music__primary_artist", "music__album")
        .order_by("-updated_at")[:12]
    )
    album_ratings = list(
        AlbumRating.objects.filter(user=user)
        .select_related("album", "album__primary_artist")
        .order_by("-updated_at")[:12]
    )
    review_cards = [serialize_rating_card(r) for r in track_ratings] + [
        serialize_album_rating_card(ar) for ar in album_ratings
    ]
    review_cards.sort(key=lambda item: item["updatedAt"], reverse=True)
    review_cards = review_cards[:12]

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
                "ratings": Rating.objects.filter(user=user).count()
                + AlbumRating.objects.filter(user=user).count(),
                "albums": SavedAlbum.objects.filter(user=user).count(),
                "following": Follow.objects.filter(follower=user).count(),
                "followers": Follow.objects.filter(following=user).count(),
            },
        },
        "ratings": review_cards,
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

    follow, created = Follow.objects.get_or_create(
        follower=request.user, following=user_to_follow
    )
    if created:
        from social.notifications import notify_new_follower

        notify_new_follower(follower=request.user, followed=user_to_follow)
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


@social_router.get("/notifications")
def list_notifications_view(request, unread_only: bool = False):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    notifications = Notification.objects.filter(recipient=request.user)
    if unread_only:
        notifications = notifications.filter(read_at__isnull=True)
    notifications = notifications.select_related("actor", "actor__profile").order_by(
        "-created_at"
    )[:50]
    return {
        "items": [serialize_notification(n) for n in notifications],
    }


@social_router.post("/notifications/{notification_id}/read")
def mark_notification_read_view(request, notification_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    updated = Notification.objects.filter(
        id=notification_id,
        recipient=request.user,
        read_at__isnull=True,
    ).update(read_at=timezone.now())
    if not updated:
        return JsonResponse({"detail": "Notification not found."}, status=404)
    return {"ok": True}


@social_router.post("/notifications/read-all")
def mark_all_notifications_read_view(request):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    Notification.objects.filter(
        recipient=request.user, read_at__isnull=True
    ).update(read_at=timezone.now())
    return {"ok": True}

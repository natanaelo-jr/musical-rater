from django.contrib.auth import get_user_model
from django.http import JsonResponse
from ninja import Router, Schema

from catalog.models import AlbumRating, Rating, RatingComment

moderation_router = Router(tags=["moderation"])
User = get_user_model()


def staff_required(request):
    if request.user.is_authenticated and request.user.is_staff:
        return None
    return JsonResponse({"detail": "Staff access required."}, status=403)


def superuser_required(request):
    if request.user.is_authenticated and request.user.is_superuser:
        return None
    return JsonResponse({"detail": "Superuser access required."}, status=403)


class UserAdminUpdateInput(Schema):
    is_active: bool | None = None
    is_staff: bool | None = None
    is_superuser: bool | None = None


def serialize_admin_user(user):
    profile = user.profile
    return {
        "id": str(user.id),
        "email": user.email,
        "displayName": profile.display_name,
        "username": profile.username or "",
        "isActive": user.is_active,
        "isStaff": user.is_staff,
        "isSuperuser": user.is_superuser,
        "createdAt": user.created_at.isoformat(),
    }


def serialize_content_author(user):
    profile = user.profile
    return {
        "id": str(user.id),
        "email": user.email,
        "displayName": profile.display_name,
        "username": profile.username or "",
    }


def serialize_track_rating(rating):
    return {
        "id": rating.id,
        "kind": "track",
        "score": rating.score,
        "review": rating.review,
        "createdAt": rating.created_at.isoformat(),
        "updatedAt": rating.updated_at.isoformat(),
        "author": serialize_content_author(rating.user),
        "target": {
            "title": rating.music.title,
            "artistName": rating.music.primary_artist.name,
        },
    }


def serialize_album_rating(album_rating):
    return {
        "id": album_rating.id,
        "kind": "album",
        "score": album_rating.score,
        "review": album_rating.review,
        "createdAt": album_rating.created_at.isoformat(),
        "updatedAt": album_rating.updated_at.isoformat(),
        "author": serialize_content_author(album_rating.user),
        "target": {
            "title": album_rating.album.title,
            "artistName": album_rating.album.primary_artist.name,
        },
    }


def serialize_comment(comment):
    rating = comment.rating
    return {
        "id": comment.id,
        "body": comment.body,
        "createdAt": comment.created_at.isoformat(),
        "author": serialize_content_author(comment.user),
        "rating": {
            "id": rating.id,
            "score": rating.score,
            "review": rating.review,
            "targetTitle": rating.music.title,
            "targetArtist": rating.music.primary_artist.name,
        },
    }


@moderation_router.get("/users")
def list_users_view(request, q: str = ""):
    auth_error = staff_required(request)
    if auth_error:
        return auth_error

    users = User.objects.select_related("profile").order_by("-created_at")
    query = q.strip()
    if query:
        users = users.filter(email__icontains=query) | users.filter(
            profile__username__icontains=query
        )

    return {"items": [serialize_admin_user(user) for user in users[:50]]}


@moderation_router.patch("/users/{user_id}")
def update_user_view(request, user_id: int, payload: UserAdminUpdateInput):
    auth_error = superuser_required(request)
    if auth_error:
        return auth_error

    user = User.objects.select_related("profile").filter(id=user_id).first()
    if user is None:
        return JsonResponse({"detail": "User not found."}, status=404)
    if user.id == request.user.id and payload.is_active is False:
        return JsonResponse(
            {"detail": "You cannot deactivate your own account."},
            status=422,
        )

    updates = payload.model_dump(exclude_unset=True)
    fields = []
    for api_field, model_field in (
        ("is_active", "is_active"),
        ("is_staff", "is_staff"),
        ("is_superuser", "is_superuser"),
    ):
        if api_field in updates:
            setattr(user, model_field, updates[api_field])
            fields.append(model_field)

    if fields:
        user.save(update_fields=fields)

    return {"user": serialize_admin_user(user)}


@moderation_router.get("/ratings")
def list_recent_ratings_view(request):
    auth_error = staff_required(request)
    if auth_error:
        return auth_error

    track_ratings = Rating.objects.select_related(
        "user", "user__profile", "music__primary_artist"
    ).order_by("-created_at")[:25]
    album_ratings = AlbumRating.objects.select_related(
        "user",
        "user__profile",
        "album__primary_artist",
    ).order_by("-created_at")[:25]
    items = [serialize_track_rating(rating) for rating in track_ratings]
    items.extend(serialize_album_rating(rating) for rating in album_ratings)
    items.sort(key=lambda item: item["createdAt"], reverse=True)
    return {"items": items[:50]}


@moderation_router.delete("/ratings/{kind}/{rating_id}")
def delete_rating_view(request, kind: str, rating_id: int):
    auth_error = staff_required(request)
    if auth_error:
        return auth_error

    model = Rating if kind == "track" else AlbumRating if kind == "album" else None
    if model is None:
        return JsonResponse({"detail": "Invalid rating kind."}, status=422)

    deleted, _ = model.objects.filter(id=rating_id).delete()
    if not deleted:
        return JsonResponse({"detail": "Rating not found."}, status=404)

    return {"ok": True}


@moderation_router.get("/comments")
def list_recent_comments_view(request):
    auth_error = staff_required(request)
    if auth_error:
        return auth_error

    comments = RatingComment.objects.select_related(
        "user",
        "user__profile",
        "rating",
        "rating__music",
        "rating__music__primary_artist",
    ).order_by("-created_at")[:50]
    return {"items": [serialize_comment(comment) for comment in comments]}


@moderation_router.delete("/comments/{comment_id}")
def delete_comment_view(request, comment_id: int):
    auth_error = staff_required(request)
    if auth_error:
        return auth_error

    deleted, _ = RatingComment.objects.filter(id=comment_id).delete()
    if not deleted:
        return JsonResponse({"detail": "Comment not found."}, status=404)

    return {"ok": True}

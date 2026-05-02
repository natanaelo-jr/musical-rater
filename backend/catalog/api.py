from django.http import JsonResponse
from ninja import Router, Schema

from catalog.models import (
    Album,
    AlbumRating,
    Favorite,
    Music,
    Rating,
    RatingComment,
    SavedAlbum,
)
from catalog.services import import_catalog_item, search_catalog

catalog_router = Router(tags=["catalog"])


def auth_required(request):
    if request.user.is_authenticated:
        return None
    return JsonResponse({"detail": "Authentication required."}, status=401)


def validation_error(message_by_field, status=422):
    return JsonResponse({"errors": message_by_field}, status=status)


class CatalogImportInput(Schema):
    source_provider: str
    external_id: str
    type: str


class RatingInput(Schema):
    score: int
    review: str = ""


class RatingCommentInput(Schema):
    body: str
    parent_id: int | None = None


def serialize_rating(rating):
    return {
        "id": rating.id,
        "musicId": rating.music_id,
        "score": rating.score,
        "review": rating.review,
        "updatedAt": rating.updated_at.isoformat(),
    }


def serialize_album_rating(album_rating):
    return {
        "id": album_rating.id,
        "albumId": album_rating.album_id,
        "score": album_rating.score,
        "review": album_rating.review,
        "updatedAt": album_rating.updated_at.isoformat(),
    }


def serialize_rating_summary(rating):
    return {
        "kind": "track",
        **serialize_rating(rating),
        "albumId": None,
        "title": rating.music.title,
        "artistName": rating.music.primary_artist.name,
        "albumTitle": rating.music.album.title if rating.music.album_id else "",
        "artworkUrl": rating.music.cover_url,
    }


def serialize_album_rating_summary(album_rating):
    album = album_rating.album
    return {
        "kind": "album",
        **serialize_album_rating(album_rating),
        "musicId": None,
        "title": album.title,
        "artistName": album.primary_artist.name,
        "albumTitle": None,
        "artworkUrl": album.cover_url,
    }


def serialize_favorite(favorite):
    music = favorite.music
    return {
        "id": favorite.id,
        "musicId": favorite.music_id,
        "title": music.title,
        "artistName": music.primary_artist.name,
        "albumTitle": music.album.title if music.album_id else "",
        "artworkUrl": music.cover_url,
        "createdAt": favorite.created_at.isoformat(),
    }


def serialize_saved_album(saved_album):
    album = saved_album.album
    return {
        "id": saved_album.id,
        "albumId": saved_album.album_id,
        "title": album.title,
        "artistName": album.primary_artist.name,
        "artworkUrl": album.cover_url,
        "releaseDate": album.release_date,
        "createdAt": saved_album.created_at.isoformat(),
    }


def _serialize_comment_author(user):
    profile = user.profile
    return {
        "id": str(user.id),
        "displayName": profile.display_name,
        "username": profile.username or "",
        "avatarUrl": profile.avatar_url,
    }


def serialize_rating_comment(comment):
    return {
        "id": comment.id,
        "body": comment.body,
        "createdAt": comment.created_at.isoformat(),
        "author": _serialize_comment_author(comment.user),
        "parentId": comment.parent_id,
    }


@catalog_router.get("/search")
def search_catalog_view(request, q: str, type: str = "all", page: int = 1):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    query = q.strip()
    if len(query) < 2:
        return validation_error({"q": "Query must have at least 2 characters."})
    if type not in {"all", "track", "album"}:
        return validation_error({"type": "Type must be one of: all, track, album."})
    if page < 1:
        return validation_error({"page": "Page must be greater than 0."})

    try:
        return search_catalog(query=query, result_type=type, page=page)
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=422)
    except Exception:
        return JsonResponse(
            {"detail": "Catalog provider is currently unavailable."}, status=502
        )


@catalog_router.get("/ratings")
def list_ratings_view(request):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    ratings = (
        Rating.objects.filter(user=request.user)
        .select_related("music", "music__primary_artist", "music__album")
        .order_by("-updated_at")[:5]
    )
    return {"items": [serialize_rating_summary(rating) for rating in ratings]}


@catalog_router.get("/album-ratings")
def list_album_ratings_view(request):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    album_ratings = (
        AlbumRating.objects.filter(user=request.user)
        .select_related("album", "album__primary_artist")
        .order_by("-updated_at")[:5]
    )
    return {
        "items": [
            serialize_album_rating_summary(ar) for ar in album_ratings
        ],
    }


@catalog_router.get("/album-ratings/{album_id}")
def get_album_rating_view(request, album_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    if not Album.objects.filter(id=album_id).exists():
        return JsonResponse({"detail": "Album not found."}, status=404)

    album_rating = AlbumRating.objects.filter(
        user=request.user, album_id=album_id
    ).first()
    return {
        "rating": serialize_album_rating(album_rating) if album_rating else None,
    }


@catalog_router.post("/album-ratings/{album_id}")
def save_album_rating_view(request, album_id: int, payload: RatingInput):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    if payload.score < 1 or payload.score > 5:
        return validation_error({"score": "Score must be between 1 and 5."})

    review = payload.review.strip()
    if len(review) > 2000:
        return validation_error({"review": "Review must be 2000 characters or less."})

    if not Album.objects.filter(id=album_id).exists():
        return JsonResponse({"detail": "Album not found."}, status=404)

    album_rating, _ = AlbumRating.objects.update_or_create(
        user=request.user,
        album_id=album_id,
        defaults={"score": payload.score, "review": review},
    )
    return {"rating": serialize_album_rating(album_rating)}


@catalog_router.delete("/album-ratings/{album_id}")
def clear_album_rating_view(request, album_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    if not Album.objects.filter(id=album_id).exists():
        return JsonResponse({"detail": "Album not found."}, status=404)

    AlbumRating.objects.filter(user=request.user, album_id=album_id).delete()
    return {"rating": None}


@catalog_router.get("/favorites")
def list_favorites_view(request):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    favorites = (
        Favorite.objects.filter(user=request.user)
        .select_related("music", "music__primary_artist", "music__album")
        .order_by("-created_at")[:8]
    )
    return {"items": [serialize_favorite(favorite) for favorite in favorites]}


@catalog_router.get("/favorites/{music_id}")
def get_favorite_view(request, music_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    if not Music.objects.filter(id=music_id).exists():
        return JsonResponse({"detail": "Track not found."}, status=404)

    favorite = (
        Favorite.objects.filter(user=request.user, music_id=music_id)
        .select_related("music", "music__primary_artist", "music__album")
        .first()
    )
    return {"favorite": serialize_favorite(favorite) if favorite else None}


@catalog_router.post("/favorites/{music_id}")
def save_favorite_view(request, music_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    if not Music.objects.filter(id=music_id).exists():
        return JsonResponse({"detail": "Track not found."}, status=404)

    favorite, created = Favorite.objects.get_or_create(
        user=request.user,
        music_id=music_id,
    )
    if created and Favorite.objects.filter(user=request.user).count() > 5:
        favorite.delete()
        return JsonResponse(
            {"detail": "You can have up to 5 favorite songs."}, status=422
        )
    favorite = (
        Favorite.objects.filter(id=favorite.id)
        .select_related("music", "music__primary_artist", "music__album")
        .get()
    )
    return {"favorite": serialize_favorite(favorite)}


@catalog_router.delete("/favorites/{music_id}")
def clear_favorite_view(request, music_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    if not Music.objects.filter(id=music_id).exists():
        return JsonResponse({"detail": "Track not found."}, status=404)

    Favorite.objects.filter(user=request.user, music_id=music_id).delete()
    return {"favorite": None}


@catalog_router.get("/albums/saved")
def list_saved_albums_view(request):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    saved_albums = (
        SavedAlbum.objects.filter(user=request.user)
        .select_related("album", "album__primary_artist")
        .order_by("-created_at")[:12]
    )
    return {
        "items": [serialize_saved_album(saved_album) for saved_album in saved_albums]
    }


@catalog_router.get("/albums/saved/{album_id}")
def get_saved_album_view(request, album_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    if not Album.objects.filter(id=album_id).exists():
        return JsonResponse({"detail": "Album not found."}, status=404)

    saved_album = (
        SavedAlbum.objects.filter(user=request.user, album_id=album_id)
        .select_related("album", "album__primary_artist")
        .first()
    )
    return {"savedAlbum": serialize_saved_album(saved_album) if saved_album else None}


@catalog_router.post("/albums/saved/{album_id}")
def save_album_view(request, album_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    if not Album.objects.filter(id=album_id).exists():
        return JsonResponse({"detail": "Album not found."}, status=404)

    saved_album, _ = SavedAlbum.objects.get_or_create(
        user=request.user,
        album_id=album_id,
    )
    saved_album = (
        SavedAlbum.objects.filter(id=saved_album.id)
        .select_related("album", "album__primary_artist")
        .get()
    )
    return {"savedAlbum": serialize_saved_album(saved_album)}


@catalog_router.delete("/albums/saved/{album_id}")
def clear_saved_album_view(request, album_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    if not Album.objects.filter(id=album_id).exists():
        return JsonResponse({"detail": "Album not found."}, status=404)

    SavedAlbum.objects.filter(user=request.user, album_id=album_id).delete()
    return {"savedAlbum": None}


@catalog_router.get("/ratings/{music_id}")
def get_rating_view(request, music_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    if not Music.objects.filter(id=music_id).exists():
        return JsonResponse({"detail": "Track not found."}, status=404)

    rating = Rating.objects.filter(user=request.user, music_id=music_id).first()
    return {"rating": serialize_rating(rating) if rating else None}


@catalog_router.post("/ratings/{music_id}")
def save_rating_view(request, music_id: int, payload: RatingInput):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    if payload.score < 1 or payload.score > 5:
        return validation_error({"score": "Score must be between 1 and 5."})

    review = payload.review.strip()
    if len(review) > 2000:
        return validation_error({"review": "Review must be 2000 characters or less."})

    if not Music.objects.filter(id=music_id).exists():
        return JsonResponse({"detail": "Track not found."}, status=404)

    rating, _ = Rating.objects.update_or_create(
        user=request.user,
        music_id=music_id,
        defaults={"score": payload.score, "review": review},
    )
    return {"rating": serialize_rating(rating)}


@catalog_router.delete("/ratings/{music_id}")
def clear_rating_view(request, music_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    if not Music.objects.filter(id=music_id).exists():
        return JsonResponse({"detail": "Track not found."}, status=404)

    Rating.objects.filter(user=request.user, music_id=music_id).delete()
    return {"rating": None}


@catalog_router.get("/music-ratings/{rating_id}/comments")
def list_rating_comments_view(request, rating_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    if not Rating.objects.filter(id=rating_id).exists():
        return JsonResponse({"detail": "Rating not found."}, status=404)

    comments = list(
        RatingComment.objects.filter(rating_id=rating_id)
        .select_related("user", "user__profile")
        .order_by("created_at")
    )
    reply_map = {}
    for comment in comments:
        if comment.parent_id:
            reply_map.setdefault(comment.parent_id, []).append(comment)

    items = []
    for comment in comments:
        if comment.parent_id is not None:
            continue
        item = serialize_rating_comment(comment)
        item["replies"] = [
            serialize_rating_comment(reply) for reply in reply_map.get(comment.id, [])
        ]
        items.append(item)

    return {"items": items}


@catalog_router.post("/music-ratings/{rating_id}/comments")
def create_rating_comment_view(request, rating_id: int, payload: RatingCommentInput):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    try:
        rating = Rating.objects.select_related("music").get(id=rating_id)
    except Rating.DoesNotExist:
        return JsonResponse({"detail": "Rating not found."}, status=404)

    body = payload.body.strip()
    if not body:
        return validation_error({"body": "Comment cannot be empty."})
    if len(body) > 2000:
        return validation_error(
            {"body": "Comment must be 2000 characters or less."},
        )

    parent = None
    if payload.parent_id is not None:
        try:
            parent = RatingComment.objects.get(
                id=payload.parent_id, rating_id=rating_id
            )
        except RatingComment.DoesNotExist:
            return JsonResponse({"detail": "Parent comment not found."}, status=404)
        if parent.parent_id is not None:
            return JsonResponse(
                {"detail": "You can only reply to a top-level comment."}, status=422
            )

    comment = RatingComment.objects.create(
        rating=rating,
        user=request.user,
        parent=parent,
        body=body,
    )
    comment = (
        RatingComment.objects.filter(id=comment.id)
        .select_related("user", "user__profile")
        .get()
    )

    from social.notifications import notify_rating_comment_created

    notify_rating_comment_created(comment=comment, rating=rating)

    payload_out = serialize_rating_comment(comment)
    payload_out["replies"] = []
    return {"comment": payload_out}


@catalog_router.delete("/music-ratings/comments/{comment_id}")
def delete_rating_comment_view(request, comment_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    comment = (
        RatingComment.objects.filter(id=comment_id, user=request.user)
        .select_related("rating")
        .first()
    )
    if comment is None:
        return JsonResponse({"detail": "Comment not found."}, status=404)

    comment.delete()
    return {"ok": True}


@catalog_router.post("/import")
def import_catalog_view(request, payload: CatalogImportInput):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    try:
        return import_catalog_item(
            source_provider=payload.source_provider,
            external_id=payload.external_id,
            item_type=payload.type,
        )
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=422)
    except Exception:
        return JsonResponse(
            {"detail": "Catalog provider is currently unavailable."}, status=502
        )

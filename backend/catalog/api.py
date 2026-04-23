from django.http import JsonResponse
from ninja import Router, Schema

from django.db.models import Max

from catalog.models import Favorite, Music, Rating
from catalog.services import (
    ensure_catalog_item,
    import_catalog_item,
    search_catalog,
    serialize_album,
    serialize_track,
)

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


class FavoriteInput(Schema):
    source_provider: str
    external_id: str
    type: str


def serialize_rating(rating):
    return {
        "id": rating.id,
        "musicId": rating.music_id,
        "score": rating.score,
    }


def serialize_rating_summary(rating):
    return {
        **serialize_rating(rating),
        "title": rating.music.title,
        "artistName": rating.music.primary_artist.name,
        "albumTitle": rating.music.album.title if rating.music.album_id else "",
        "artworkUrl": rating.music.cover_url,
    }


def serialize_favorite(favorite):
    if favorite.music_id:
        item = serialize_track(favorite.music)
    else:
        item = serialize_album(favorite.album)

    return {
        "id": favorite.id,
        "position": favorite.position,
        "item": item,
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


@catalog_router.get("/favorites")
def list_favorites_view(request):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    favorites = (
        Favorite.objects.filter(user=request.user)
        .select_related(
            "music",
            "music__primary_artist",
            "music__album",
            "album",
            "album__primary_artist",
        )
        .order_by("position", "-created_at")
    )
    return {"items": [serialize_favorite(favorite) for favorite in favorites]}


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

    if not Music.objects.filter(id=music_id).exists():
        return JsonResponse({"detail": "Track not found."}, status=404)

    rating, _ = Rating.objects.update_or_create(
        user=request.user,
        music_id=music_id,
        defaults={"score": payload.score},
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


@catalog_router.post("/favorites")
def save_favorite_view(request, payload: FavoriteInput):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    if payload.type not in {"track", "album"}:
        return validation_error({"type": "Type must be one of: track, album."})

    item = ensure_catalog_item(
        source_provider=payload.source_provider,
        external_id=payload.external_id,
        item_type=payload.type,
    )

    current_max_position = (
        Favorite.objects.filter(user=request.user).aggregate(Max("position"))[
            "position__max"
        ]
        or 0
    )

    favorite_defaults = {"position": current_max_position + 1}
    if payload.type == "track":
        favorite, created = Favorite.objects.get_or_create(
            user=request.user,
            music=item,
            defaults=favorite_defaults,
        )
    else:
        favorite, created = Favorite.objects.get_or_create(
            user=request.user,
            album=item,
            defaults=favorite_defaults,
        )

    if not created and favorite.position is None:
        favorite.position = current_max_position + 1
        favorite.save(update_fields=["position"])

    favorite = Favorite.objects.select_related(
        "music",
        "music__primary_artist",
        "music__album",
        "album",
        "album__primary_artist",
    ).get(id=favorite.id)
    return {"favorite": serialize_favorite(favorite)}


@catalog_router.delete("/favorites/{favorite_id}")
def clear_favorite_view(request, favorite_id: int):
    auth_error = auth_required(request)
    if auth_error:
        return auth_error

    favorite = Favorite.objects.filter(user=request.user, id=favorite_id).first()
    if favorite is None:
        return JsonResponse({"detail": "Favorite not found."}, status=404)

    removed_position = favorite.position
    favorite.delete()

    if removed_position is not None:
        trailing_favorites = Favorite.objects.filter(
            user=request.user, position__gt=removed_position
        ).order_by("position")
        for trailing_favorite in trailing_favorites:
            trailing_favorite.position -= 1
            trailing_favorite.save(update_fields=["position"])

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

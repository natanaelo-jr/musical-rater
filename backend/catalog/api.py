from django.http import JsonResponse
from ninja import Router, Schema

from catalog.models import Music, Rating
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


def serialize_rating(rating):
    return {
        "id": rating.id,
        "musicId": rating.music_id,
        "score": rating.score,
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

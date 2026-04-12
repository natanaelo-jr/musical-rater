from django.http import JsonResponse
from ninja import Router, Schema

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
        return JsonResponse({"detail": "Catalog provider is currently unavailable."}, status=502)


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
        return JsonResponse({"detail": "Catalog provider is currently unavailable."}, status=502)


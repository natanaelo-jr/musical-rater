from ninja import NinjaAPI
from accounts.api import auth_router, profile_router
from accounts.moderation_api import moderation_router
from catalog.api import catalog_router, get_song_detail_view
from social.api import list_feed_view, social_router

api = NinjaAPI()
api.add_router("/auth", auth_router)
api.add_router("/profile", profile_router)
api.add_router("/catalog", catalog_router)
api.add_router("/social", social_router)
api.add_router("/moderation", moderation_router)


@api.get("/health")
def health(request):
    return {"status": "ok"}


@api.get("/feed")
def feed(request, page: int = 1):
    return list_feed_view(request, page=page)


@api.get("/songs/{music_id}")
def song_detail(request, music_id: int, page: int = 1):
    return get_song_detail_view(request, music_id=music_id, page=page)

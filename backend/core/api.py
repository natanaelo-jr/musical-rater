from ninja import NinjaAPI
from accounts.api import auth_router, profile_router

api = NinjaAPI()
api.add_router("/auth", auth_router)
api.add_router("/profile", profile_router)


@api.get("/health")
def health(request):
    return {"status": "ok"}

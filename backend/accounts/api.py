from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import JsonResponse
from django.middleware.csrf import get_token
from ninja import Router, Schema

from .models import User
from .services import ProfileValidationError, serialize_user, update_profile_for_user

auth_router = Router(tags=["auth"])
profile_router = Router(tags=["profile"])


def validation_error(message_by_field, status=422):
    return JsonResponse({"errors": message_by_field}, status=status)


class RegisterInput(Schema):
    email: str
    password: str
    display_name: str


class LoginInput(Schema):
    email: str
    password: str


class ProfileUpdateInput(Schema):
    display_name: str | None = None
    username: str | None = None
    avatar_url: str | None = None
    bio: str | None = None


@auth_router.get("/csrf")
def csrf_token(request):
    return {"csrfToken": get_token(request)}


@auth_router.post("/register")
def register(request, payload: RegisterInput):
    email = payload.email.strip().lower()
    display_name = payload.display_name.strip()

    if not display_name:
        return validation_error({"display_name": "Display name is required."})
    if len(payload.password) < 8:
        return validation_error(
            {"password": "Password must have at least 8 characters."}
        )

    try:
        user = User.objects.create_user(email=email, password=payload.password)
    except IntegrityError:
        return validation_error({"email": "This email is already in use."})

    user.profile.display_name = display_name
    user.profile.save(update_fields=["display_name"])
    login(request, user)
    return {"authenticated": True, "user": serialize_user(user)}


@auth_router.post("/login")
def login_view(request, payload: LoginInput):
    user = authenticate(
        request, email=payload.email.strip().lower(), password=payload.password
    )
    if user is None:
        return JsonResponse(
            {"errors": {"credentials": "Invalid email or password."}}, status=401
        )

    login(request, user)
    return {"authenticated": True, "user": serialize_user(user)}


@auth_router.post("/logout")
def logout_view(request):
    logout(request)
    return {"ok": True}


@auth_router.get("/me")
def me(request):
    if not request.user.is_authenticated:
        return {"authenticated": False, "user": None}

    return {"authenticated": True, "user": serialize_user(request.user)}


@profile_router.get("/me")
def get_profile(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)
    return {"user": serialize_user(request.user)}


@profile_router.patch("/me")
def update_profile(request, payload: ProfileUpdateInput):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Authentication required."}, status=401)

    updates = payload.model_dump(exclude_unset=True)

    try:
        user_payload = update_profile_for_user(request.user, updates)
    except ProfileValidationError as exc:
        return validation_error(exc.errors)

    return {"user": user_payload}

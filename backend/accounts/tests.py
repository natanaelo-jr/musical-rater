from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Profile
from .services import ProfileValidationError, serialize_user, update_profile_for_user


class AuthApiTests(TestCase):
    def test_register_creates_user_profile_and_session(self):
        response = self.client.post(
            "/api/auth/register",
            data={
                "email": "listener@example.com",
                "password": "StrongPass123!",
                "display_name": "Listener",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["email"], "listener@example.com")
        self.assertEqual(response.json()["user"]["displayName"], "Listener")
        self.assertIn("_auth_user_id", self.client.session)

        user = get_user_model().objects.get(email="listener@example.com")
        self.assertEqual(user.profile.display_name, "Listener")

    def test_login_returns_authenticated_user_payload(self):
        user = get_user_model().objects.create_user(
            email="critic@example.com",
            password="StrongPass123!",
        )
        user.profile.display_name = "Critic"
        user.profile.save(update_fields=["display_name"])

        response = self.client.post(
            "/api/auth/login",
            data={"email": "critic@example.com", "password": "StrongPass123!"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["displayName"], "Critic")
        self.assertIn("_auth_user_id", self.client.session)

    def test_me_returns_anonymous_without_session(self):
        response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"authenticated": False, "user": None})

    def test_me_returns_authenticated_user_with_profile(self):
        user = get_user_model().objects.create_user(
            email="profile@example.com",
            password="StrongPass123!",
        )
        user.profile.display_name = "Profile User"
        user.profile.username = "profile-user"
        user.profile.bio = "Rates musicals nightly."
        user.profile.save(update_fields=["display_name", "username", "bio"])
        self.client.force_login(user)

        response = self.client.get("/api/auth/me")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "authenticated": True,
                "user": {
                    "id": str(user.id),
                    "email": "profile@example.com",
                    "displayName": "Profile User",
                    "username": "profile-user",
                    "avatarUrl": "",
                    "bio": "Rates musicals nightly.",
                },
            },
        )

    def test_get_profile_requires_authentication(self):
        response = self.client.get("/api/profile/me")

        self.assertEqual(response.status_code, 401)

    def test_profile_update_requires_authentication(self):
        response = self.client.patch(
            "/api/profile/me",
            data={"display_name": "Hidden Listener"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    def test_logout_clears_session(self):
        user = get_user_model().objects.create_user(
            email="logout@example.com",
            password="StrongPass123!",
        )
        self.client.force_login(user)

        response = self.client.post("/api/auth/logout", content_type="application/json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})
        self.assertNotIn("_auth_user_id", self.client.session)


class ProfileModelTests(TestCase):
    def test_user_creation_creates_profile(self):
        user = get_user_model().objects.create_user(
            email="model-listener@example.com",
            password="StrongPass123!",
        )

        self.assertTrue(Profile.objects.filter(user=user).exists())

    def test_user_creation_defaults_display_name_to_email_prefix(self):
        user = get_user_model().objects.create_user(
            email="listener@example.com",
            password="StrongPass123!",
        )

        self.assertEqual(user.profile.display_name, "listener")

    def test_saving_blank_username_stores_null(self):
        user = get_user_model().objects.create_user(
            email="blank-username@example.com",
            password="StrongPass123!",
        )
        user.profile.username = ""
        user.profile.save(update_fields=["username"])

        user.refresh_from_db()
        self.assertIsNone(user.profile.username)


class ProfileServiceTests(TestCase):
    def test_serialize_user_returns_editable_profile_fields(self):
        user = get_user_model().objects.create_user(
            email="editable@example.com",
            password="StrongPass123!",
        )
        user.profile.display_name = "Editable Listener"
        user.profile.username = "editable"
        user.profile.avatar_url = "https://example.com/editable.png"
        user.profile.bio = "Collects original cast recordings."
        user.profile.save(
            update_fields=["display_name", "username", "avatar_url", "bio"]
        )

        self.assertEqual(
            serialize_user(user),
            {
                "id": str(user.id),
                "email": "editable@example.com",
                "displayName": "Editable Listener",
                "username": "editable",
                "avatarUrl": "https://example.com/editable.png",
                "bio": "Collects original cast recordings.",
            },
        )

    def test_serialize_user_returns_blank_username_for_null_username(self):
        user = get_user_model().objects.create_user(
            email="no-username@example.com",
            password="StrongPass123!",
        )
        user.profile.username = None
        user.profile.save(update_fields=["username"])

        self.assertEqual(serialize_user(user)["username"], "")

    def test_update_profile_persists_profile_fields(self):
        user = get_user_model().objects.create_user(
            email="editor@example.com",
            password="StrongPass123!",
        )

        update_profile_for_user(
            user,
            {
                "display_name": "Editor",
                "username": "editor",
                "avatar_url": "https://example.com/avatar.png",
                "bio": "Loves cast recordings.",
            },
        )

        user.refresh_from_db()
        self.assertEqual(user.profile.display_name, "Editor")
        self.assertEqual(user.profile.username, "editor")
        self.assertEqual(user.profile.avatar_url, "https://example.com/avatar.png")
        self.assertEqual(user.profile.bio, "Loves cast recordings.")

    def test_update_profile_trims_profile_text_fields(self):
        user = get_user_model().objects.create_user(
            email="trim@example.com",
            password="StrongPass123!",
        )

        update_profile_for_user(
            user,
            {
                "display_name": "  Trimmed Listener  ",
                "username": "  trimmed-listener  ",
                "avatar_url": "  https://example.com/trimmed.png  ",
                "bio": "  Finds details in every overture.  ",
            },
        )

        user.refresh_from_db()
        self.assertEqual(user.profile.display_name, "Trimmed Listener")
        self.assertEqual(user.profile.username, "trimmed-listener")
        self.assertEqual(user.profile.avatar_url, "https://example.com/trimmed.png")
        self.assertEqual(user.profile.bio, "Finds details in every overture.")

    def test_update_profile_rejects_blank_display_name(self):
        user = get_user_model().objects.create_user(
            email="blank-name@example.com",
            password="StrongPass123!",
        )
        original_display_name = user.profile.display_name

        with self.assertRaises(ProfileValidationError) as context:
            update_profile_for_user(user, {"display_name": "   "})

        self.assertEqual(
            context.exception.errors,
            {"display_name": "Display name is required."},
        )
        user.refresh_from_db()
        self.assertEqual(user.profile.display_name, original_display_name)

    def test_update_profile_rejects_invalid_avatar_url(self):
        user = get_user_model().objects.create_user(
            email="avatar@example.com",
            password="StrongPass123!",
        )
        user.profile.avatar_url = "https://example.com/current.png"
        user.profile.save(update_fields=["avatar_url"])

        with self.assertRaises(ProfileValidationError) as context:
            update_profile_for_user(user, {"avatar_url": "not-a-url"})

        self.assertEqual(
            context.exception.errors,
            {"avatar_url": "Avatar URL must be valid."},
        )
        user.refresh_from_db()
        self.assertEqual(user.profile.avatar_url, "https://example.com/current.png")

    def test_update_profile_rejects_duplicate_username(self):
        existing_user = get_user_model().objects.create_user(
            email="existing@example.com",
            password="StrongPass123!",
        )
        existing_user.profile.username = "taken"
        existing_user.profile.save(update_fields=["username"])
        user = get_user_model().objects.create_user(
            email="new-listener@example.com",
            password="StrongPass123!",
        )

        with self.assertRaises(ProfileValidationError) as context:
            update_profile_for_user(user, {"username": "taken"})

        self.assertEqual(
            context.exception.errors,
            {"username": "This username is already in use."},
        )
        user.refresh_from_db()
        self.assertIsNone(user.profile.username)

    def test_update_profile_allows_clearing_username_with_blank_text(self):
        user = get_user_model().objects.create_user(
            email="clear@example.com",
            password="StrongPass123!",
        )
        user.profile.username = "clearable"
        user.profile.save(update_fields=["username"])

        update_profile_for_user(user, {"username": "   "})

        user.refresh_from_db()
        self.assertIsNone(user.profile.username)

    def test_update_profile_preserves_unspecified_profile_fields(self):
        user = get_user_model().objects.create_user(
            email="partial@example.com",
            password="StrongPass123!",
        )
        user.profile.display_name = "Partial Listener"
        user.profile.username = "partial"
        user.profile.avatar_url = "https://example.com/partial.png"
        user.profile.bio = "Keeps old notes."
        user.profile.save(
            update_fields=["display_name", "username", "avatar_url", "bio"]
        )

        update_profile_for_user(user, {"display_name": "Updated Listener"})

        user.refresh_from_db()
        self.assertEqual(user.profile.display_name, "Updated Listener")
        self.assertEqual(user.profile.username, "partial")
        self.assertEqual(user.profile.avatar_url, "https://example.com/partial.png")
        self.assertEqual(user.profile.bio, "Keeps old notes.")

from django.contrib.auth import get_user_model
from django.test import TestCase


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

    def test_profile_update_requires_authentication(self):
        response = self.client.patch(
            "/api/profile/me",
            data={"display_name": "Hidden Listener"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    def test_profile_update_persists_profile_fields(self):
        user = get_user_model().objects.create_user(
            email="editor@example.com",
            password="StrongPass123!",
        )
        self.client.force_login(user)

        response = self.client.patch(
            "/api/profile/me",
            data={
                "display_name": "Editor",
                "username": "editor",
                "avatar_url": "https://example.com/avatar.png",
                "bio": "Loves cast recordings.",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

        user.refresh_from_db()
        self.assertEqual(user.profile.display_name, "Editor")
        self.assertEqual(user.profile.username, "editor")
        self.assertEqual(user.profile.avatar_url, "https://example.com/avatar.png")
        self.assertEqual(user.profile.bio, "Loves cast recordings.")

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

from django.contrib.auth import get_user_model
from django.test import TestCase

from catalog.models import Album, AlbumRating, Artist, Music, Rating, RatingComment


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
                    "isStaff": False,
                    "isSuperuser": False,
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


class AccountModelTests(TestCase):
    def test_user_manager_requires_email(self):
        with self.assertRaisesMessage(ValueError, "The given email must be set"):
            get_user_model().objects.create_user(email="", password="StrongPass123!")

    def test_create_superuser_requires_staff_flag(self):
        with self.assertRaisesMessage(ValueError, "Superuser must have is_staff=True."):
            get_user_model().objects.create_superuser(
                email="admin@example.com",
                password="StrongPass123!",
                is_staff=False,
            )

    def test_create_superuser_requires_superuser_flag(self):
        with self.assertRaisesMessage(
            ValueError, "Superuser must have is_superuser=True."
        ):
            get_user_model().objects.create_superuser(
                email="admin@example.com",
                password="StrongPass123!",
                is_superuser=False,
            )

    def test_user_string_returns_email(self):
        user = get_user_model().objects.create_user(
            email="listener@example.com",
            password="StrongPass123!",
        )

        self.assertEqual(str(user), "listener@example.com")

    def test_profile_save_converts_blank_username_to_null(self):
        user = get_user_model().objects.create_user(
            email="profile@example.com",
            password="StrongPass123!",
        )

        user.profile.username = ""
        user.profile.save(update_fields=["username"])
        user.profile.refresh_from_db()

        self.assertIsNone(user.profile.username)

    def test_profile_string_prefers_display_name_and_falls_back_to_email(self):
        user = get_user_model().objects.create_user(
            email="profile-string@example.com",
            password="StrongPass123!",
        )
        user.profile.display_name = ""
        user.profile.save(update_fields=["display_name"])

        self.assertEqual(str(user.profile), "profile-string@example.com")

        user.profile.display_name = "Profile Name"
        user.profile.save(update_fields=["display_name"])

        self.assertEqual(str(user.profile), "Profile Name")


class ModerationApiTests(TestCase):
    def setUp(self):
        self.staff = get_user_model().objects.create_user(
            email="staff@example.com",
            password="StrongPass123!",
            is_staff=True,
        )
        self.superuser = get_user_model().objects.create_superuser(
            email="admin@example.com",
            password="StrongPass123!",
        )
        self.user = get_user_model().objects.create_user(
            email="listener@example.com",
            password="StrongPass123!",
        )
        self.user.profile.display_name = "Listener"
        self.user.profile.username = "listener"
        self.user.profile.save(update_fields=["display_name", "username"])

    def test_list_users_requires_staff(self):
        self.client.force_login(self.user)

        response = self.client.get("/api/moderation/users")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "Staff access required.")

    def test_list_users_filters_by_email_or_username(self):
        self.client.force_login(self.staff)

        response = self.client.get("/api/moderation/users", {"q": "listen"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["items"]), 1)
        self.assertEqual(response.json()["items"][0]["email"], "listener@example.com")
        self.assertEqual(response.json()["items"][0]["username"], "listener")

    def test_update_user_requires_superuser(self):
        self.client.force_login(self.staff)

        response = self.client.patch(
            f"/api/moderation/users/{self.user.id}",
            data={"is_staff": True},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["detail"], "Superuser access required.")

    def test_superuser_updates_admin_flags(self):
        self.client.force_login(self.superuser)

        response = self.client.patch(
            f"/api/moderation/users/{self.user.id}",
            data={"is_staff": True, "is_superuser": True},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_staff)
        self.assertTrue(self.user.is_superuser)
        self.assertTrue(response.json()["user"]["isStaff"])

    def test_superuser_cannot_deactivate_self(self):
        self.client.force_login(self.superuser)

        response = self.client.patch(
            f"/api/moderation/users/{self.superuser.id}",
            data={"is_active": False},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json()["detail"], "You cannot deactivate your own account."
        )

    def test_list_recent_ratings_serializes_track_and_album_items(self):
        self.client.force_login(self.staff)
        music, album = self._create_catalog_items()
        Rating.objects.create(
            user=self.user, music=music, score=4, review="Sharp opener."
        )
        AlbumRating.objects.create(
            user=self.user, album=album, score=5, review="No skips."
        )

        response = self.client.get("/api/moderation/ratings")

        self.assertEqual(response.status_code, 200)
        kinds = {item["kind"] for item in response.json()["items"]}
        self.assertEqual(kinds, {"track", "album"})
        self.assertEqual(response.json()["items"][0]["author"]["username"], "listener")

    def test_delete_rating_rejects_invalid_kind_and_deletes_existing_rating(self):
        self.client.force_login(self.staff)
        music, _ = self._create_catalog_items()
        rating = Rating.objects.create(user=self.user, music=music, score=4)

        invalid_response = self.client.delete("/api/moderation/ratings/show/999")
        delete_response = self.client.delete(
            f"/api/moderation/ratings/track/{rating.id}"
        )

        self.assertEqual(invalid_response.status_code, 422)
        self.assertEqual(invalid_response.json()["detail"], "Invalid rating kind.")
        self.assertEqual(delete_response.status_code, 200)
        self.assertFalse(Rating.objects.filter(id=rating.id).exists())

    def test_list_and_delete_recent_comments(self):
        self.client.force_login(self.staff)
        music, _ = self._create_catalog_items()
        rating = Rating.objects.create(user=self.user, music=music, score=4)
        comment = RatingComment.objects.create(
            rating=rating, user=self.user, body="Strong bridge."
        )

        list_response = self.client.get("/api/moderation/comments")
        delete_response = self.client.delete(f"/api/moderation/comments/{comment.id}")

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()["items"][0]["body"], "Strong bridge.")
        self.assertEqual(
            list_response.json()["items"][0]["rating"]["targetTitle"], "My Shot"
        )
        self.assertEqual(delete_response.status_code, 200)
        self.assertFalse(RatingComment.objects.filter(id=comment.id).exists())

    def test_delete_missing_comment_returns_404(self):
        self.client.force_login(self.staff)

        response = self.client.delete("/api/moderation/comments/999999")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Comment not found.")

    def _create_catalog_items(self):
        artist = Artist.objects.create(
            name="Lin-Manuel Miranda",
            source_provider="deezer",
            external_id="artist-1",
        )
        album = Album.objects.create(
            title="Hamilton",
            primary_artist=artist,
            source_provider="deezer",
            external_id="album-1",
        )
        music = Music.objects.create(
            title="My Shot",
            primary_artist=artist,
            album=album,
            source_provider="deezer",
            external_id="track-1",
        )
        return music, album

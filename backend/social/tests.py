from django.contrib.auth import get_user_model
from django.test import TestCase

from catalog.models import Album, Artist, Music, Rating, SavedAlbum
from social.models import Follow


class SocialApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="listener@example.com",
            password="StrongPass123!",
        )
        self.other_user = get_user_model().objects.create_user(
            email="critic@example.com",
            password="StrongPass123!",
        )
        self.other_user.profile.display_name = "Critic"
        self.other_user.profile.username = "critic"
        self.other_user.profile.save(update_fields=["display_name", "username"])

    def test_follow_requires_authentication(self):
        response = self.client.post(
            f"/api/social/following/{self.other_user.id}",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    def test_follow_user_creates_relationship(self):
        self.client.force_login(self.user)

        response = self.client.post(
            f"/api/social/following/{self.other_user.id}",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["following"]["username"], "critic")
        self.assertTrue(
            Follow.objects.filter(
                follower=self.user, following=self.other_user
            ).exists()
        )

    def test_search_users_returns_matching_profiles_with_follow_state(self):
        self.client.force_login(self.user)
        Follow.objects.create(follower=self.user, following=self.other_user)

        response = self.client.get("/api/social/users", {"q": "cri"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"][0]["username"], "critic")
        self.assertEqual(response.json()["items"][0]["isFollowing"], True)

    def test_search_users_excludes_current_user(self):
        self.user.profile.display_name = "Listener"
        self.user.profile.save(update_fields=["display_name"])
        self.client.force_login(self.user)

        response = self.client.get("/api/social/users", {"q": "listener"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"], [])

    def test_follow_user_is_idempotent(self):
        self.client.force_login(self.user)

        self.client.post(
            f"/api/social/following/{self.other_user.id}",
            content_type="application/json",
        )
        self.client.post(
            f"/api/social/following/{self.other_user.id}",
            content_type="application/json",
        )

        self.assertEqual(Follow.objects.count(), 1)

    def test_follow_rejects_self_follow(self):
        self.client.force_login(self.user)

        response = self.client.post(
            f"/api/social/following/{self.user.id}",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["detail"], "You cannot follow yourself.")

    def test_list_following_returns_followed_users(self):
        self.client.force_login(self.user)
        Follow.objects.create(follower=self.user, following=self.other_user)

        response = self.client.get("/api/social/following")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"][0]["displayName"], "Critic")

    def test_public_profile_returns_stats_ratings_and_follow_state(self):
        self.client.force_login(self.user)
        Follow.objects.create(follower=self.user, following=self.other_user)
        artist = Artist.objects.create(
            name="Lin-Manuel Miranda",
            source_provider="musicbrainz",
            external_id="artist-1",
        )
        music = Music.objects.create(
            title="My Shot",
            primary_artist=artist,
            source_provider="musicbrainz",
            external_id="recording-1",
        )
        album = Album.objects.create(
            title="Hamilton",
            primary_artist=artist,
            source_provider="musicbrainz",
            external_id="release-1",
        )
        SavedAlbum.objects.create(user=self.other_user, album=album)
        Rating.objects.create(
            user=self.other_user,
            music=music,
            score=5,
            review="A precise, high-energy thesis statement.",
        )

        response = self.client.get(f"/api/social/users/{self.other_user.id}")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["profile"]["username"], "critic")
        self.assertEqual(payload["profile"]["isFollowing"], True)
        self.assertEqual(payload["profile"]["stats"]["ratings"], 1)
        self.assertEqual(payload["profile"]["stats"]["albums"], 1)
        self.assertEqual(payload["profile"]["stats"]["followers"], 1)
        self.assertEqual(payload["savedAlbums"][0]["title"], "Hamilton")
        self.assertEqual(payload["ratings"][0]["title"], "My Shot")
        self.assertEqual(
            payload["ratings"][0]["review"],
            "A precise, high-energy thesis statement.",
        )

    def test_unfollow_user_removes_relationship(self):
        self.client.force_login(self.user)
        Follow.objects.create(follower=self.user, following=self.other_user)

        response = self.client.delete(f"/api/social/following/{self.other_user.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True, "removed": True})
        self.assertFalse(
            Follow.objects.filter(
                follower=self.user, following=self.other_user
            ).exists()
        )

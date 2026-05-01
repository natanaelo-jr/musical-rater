from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from catalog.models import (
    Album,
    AlbumRating,
    Artist,
    Favorite,
    Music,
    Rating,
    RatingComment,
    SavedAlbum,
)


class CatalogApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="listener@example.com",
            password="StrongPass123!",
        )

    def test_search_requires_authentication(self):
        response = self.client.get("/api/catalog/search", {"q": "hamilton"})

        self.assertEqual(response.status_code, 401)

    @patch("catalog.api.search_catalog")
    def test_search_returns_normalized_results(self, search_catalog_mock):
        self.client.force_login(self.user)
        search_catalog_mock.return_value = {
            "items": [
                {
                    "type": "album",
                    "sourceProvider": "musicbrainz",
                    "externalId": "release-1",
                    "title": "Hamilton",
                    "artistName": "Original Broadway Cast",
                    "artworkUrl": "",
                    "releaseDate": "2015-09-25",
                    "imported": False,
                    "metadata": {"country": "US"},
                }
            ],
            "page": 1,
            "hasNextPage": False,
        }

        response = self.client.get(
            "/api/catalog/search", {"q": "hamilton", "type": "album"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"][0]["title"], "Hamilton")
        search_catalog_mock.assert_called_once_with(
            query="hamilton", result_type="album", page=1
        )

    def test_search_rejects_blank_query(self):
        self.client.force_login(self.user)

        response = self.client.get("/api/catalog/search", {"q": " "})

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json()["errors"]["q"], "Query must have at least 2 characters."
        )

    def test_import_requires_authentication(self):
        response = self.client.post(
            "/api/catalog/import",
            data={
                "source_provider": "musicbrainz",
                "external_id": "release-1",
                "type": "album",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    @patch("catalog.api.import_catalog_item")
    def test_import_returns_local_item_payload(self, import_catalog_item_mock):
        self.client.force_login(self.user)
        import_catalog_item_mock.return_value = {
            "item": {
                "type": "album",
                "id": 7,
                "sourceProvider": "musicbrainz",
                "externalId": "release-1",
                "title": "Hamilton",
                "artistName": "Original Broadway Cast",
                "artworkUrl": "",
                "releaseDate": "2015-09-25",
                "imported": True,
            }
        }

        response = self.client.post(
            "/api/catalog/import",
            data={
                "source_provider": "musicbrainz",
                "external_id": "release-1",
                "type": "album",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["item"]["imported"], True)
        import_catalog_item_mock.assert_called_once_with(
            source_provider="musicbrainz",
            external_id="release-1",
            item_type="album",
        )

    def test_save_rating_requires_authentication(self):
        music = self._create_music()

        response = self.client.post(
            f"/api/catalog/ratings/{music.id}",
            data={"score": 4},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 401)

    def test_save_rating_creates_or_updates_user_rating(self):
        self.client.force_login(self.user)
        music = self._create_music()

        first_response = self.client.post(
            f"/api/catalog/ratings/{music.id}",
            data={"score": 4},
            content_type="application/json",
        )
        second_response = self.client.post(
            f"/api/catalog/ratings/{music.id}",
            data={"score": 5},
            content_type="application/json",
        )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(second_response.json()["rating"]["score"], 5)
        self.assertEqual(Rating.objects.count(), 1)

    def test_save_rating_persists_review_text(self):
        self.client.force_login(self.user)
        music = self._create_music()

        response = self.client.post(
            f"/api/catalog/ratings/{music.id}",
            data={"score": 4, "review": "Great opener with sharp vocals."},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["rating"]["review"], "Great opener with sharp vocals."
        )
        self.assertEqual(Rating.objects.get().review, "Great opener with sharp vocals.")

    def test_save_rating_rejects_long_review(self):
        self.client.force_login(self.user)
        music = self._create_music()

        response = self.client.post(
            f"/api/catalog/ratings/{music.id}",
            data={"score": 4, "review": "x" * 2001},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json()["errors"]["review"],
            "Review must be 2000 characters or less.",
        )

    def test_save_rating_rejects_out_of_range_score(self):
        self.client.force_login(self.user)
        music = self._create_music()

        response = self.client.post(
            f"/api/catalog/ratings/{music.id}",
            data={"score": 6},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json()["errors"]["score"], "Score must be between 1 and 5."
        )

    def test_get_rating_returns_current_user_rating(self):
        self.client.force_login(self.user)
        music = self._create_music()
        Rating.objects.create(user=self.user, music=music, score=3, review="Punchy.")

        response = self.client.get(f"/api/catalog/ratings/{music.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["rating"]["score"], 3)
        self.assertEqual(response.json()["rating"]["review"], "Punchy.")

    def test_list_ratings_returns_recent_user_ratings(self):
        self.client.force_login(self.user)
        music = self._create_music()
        Rating.objects.create(user=self.user, music=music, score=4, review="Memorable.")

        response = self.client.get("/api/catalog/ratings")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"][0]["kind"], "track")
        self.assertEqual(response.json()["items"][0]["title"], "My Shot")
        self.assertEqual(
            response.json()["items"][0]["artistName"], "Lin-Manuel Miranda"
        )
        self.assertEqual(response.json()["items"][0]["score"], 4)
        self.assertEqual(response.json()["items"][0]["review"], "Memorable.")

    def test_clear_rating_removes_current_user_rating(self):
        self.client.force_login(self.user)
        music = self._create_music()
        Rating.objects.create(user=self.user, music=music, score=3)

        response = self.client.delete(f"/api/catalog/ratings/{music.id}")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["rating"])
        self.assertEqual(Rating.objects.count(), 0)

    def test_save_favorite_creates_user_favorite(self):
        self.client.force_login(self.user)
        music = self._create_music()

        response = self.client.post(
            f"/api/catalog/favorites/{music.id}",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["favorite"]["title"], "My Shot")
        self.assertTrue(Favorite.objects.filter(user=self.user, music=music).exists())

    def test_get_favorite_returns_current_state(self):
        self.client.force_login(self.user)
        music = self._create_music()
        Favorite.objects.create(user=self.user, music=music)

        response = self.client.get(f"/api/catalog/favorites/{music.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["favorite"]["musicId"], music.id)

    def test_list_favorites_returns_recent_user_favorites(self):
        self.client.force_login(self.user)
        music = self._create_music()
        Favorite.objects.create(user=self.user, music=music)

        response = self.client.get("/api/catalog/favorites")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"][0]["title"], "My Shot")
        self.assertEqual(
            response.json()["items"][0]["artistName"], "Lin-Manuel Miranda"
        )

    def test_clear_favorite_removes_user_favorite(self):
        self.client.force_login(self.user)
        music = self._create_music()
        Favorite.objects.create(user=self.user, music=music)

        response = self.client.delete(f"/api/catalog/favorites/{music.id}")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["favorite"])
        self.assertEqual(Favorite.objects.count(), 0)

    def test_save_favorite_rejects_more_than_five_songs(self):
        self.client.force_login(self.user)

        artist = Artist.objects.create(
            name="Favorite Artist",
            source_provider="musicbrainz",
            external_id="artist-favorite-limit",
        )
        for index in range(5):
            music = Music.objects.create(
                title=f"Song {index}",
                primary_artist=artist,
                source_provider="musicbrainz",
                external_id=f"favorite-song-{index}",
            )
            Favorite.objects.create(user=self.user, music=music)

        extra_music = Music.objects.create(
            title="Song extra",
            primary_artist=artist,
            source_provider="musicbrainz",
            external_id="favorite-song-extra",
        )
        response = self.client.post(
            f"/api/catalog/favorites/{extra_music.id}",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json()["detail"], "You can have up to 5 favorite songs."
        )
        self.assertEqual(Favorite.objects.filter(user=self.user).count(), 5)

    def test_save_album_creates_user_saved_album(self):
        self.client.force_login(self.user)
        album = self._create_album()

        response = self.client.post(
            f"/api/catalog/albums/saved/{album.id}",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["savedAlbum"]["title"], "Hamilton")
        self.assertTrue(SavedAlbum.objects.filter(user=self.user, album=album).exists())

    def test_get_saved_album_returns_current_state(self):
        self.client.force_login(self.user)
        album = self._create_album()
        SavedAlbum.objects.create(user=self.user, album=album)

        response = self.client.get(f"/api/catalog/albums/saved/{album.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["savedAlbum"]["albumId"], album.id)

    def test_list_saved_albums_returns_recent_user_albums(self):
        self.client.force_login(self.user)
        album = self._create_album()
        SavedAlbum.objects.create(user=self.user, album=album)

        response = self.client.get("/api/catalog/albums/saved")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"][0]["title"], "Hamilton")
        self.assertEqual(
            response.json()["items"][0]["artistName"], "Lin-Manuel Miranda"
        )

    def test_clear_saved_album_removes_user_album(self):
        self.client.force_login(self.user)
        album = self._create_album()
        SavedAlbum.objects.create(user=self.user, album=album)

        response = self.client.delete(f"/api/catalog/albums/saved/{album.id}")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["savedAlbum"])
        self.assertEqual(SavedAlbum.objects.count(), 0)

    def test_save_album_rating_creates_or_updates(self):
        self.client.force_login(self.user)
        album = self._create_album()

        first = self.client.post(
            f"/api/catalog/album-ratings/{album.id}",
            data={"score": 4, "review": "Solid cast recording."},
            content_type="application/json",
        )
        second = self.client.post(
            f"/api/catalog/album-ratings/{album.id}",
            data={"score": 5, "review": "Even better on relisten."},
            content_type="application/json",
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json()["rating"]["score"], 5)
        self.assertEqual(AlbumRating.objects.count(), 1)

    def test_list_album_ratings_returns_summaries(self):
        self.client.force_login(self.user)
        album = self._create_album()
        AlbumRating.objects.create(
            user=self.user, album=album, score=4, review="Grand."
        )

        response = self.client.get("/api/catalog/album-ratings")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"][0]["kind"], "album")
        self.assertEqual(response.json()["items"][0]["title"], "Hamilton")

    def test_get_album_rating_returns_current_user_row(self):
        self.client.force_login(self.user)
        album = self._create_album()
        AlbumRating.objects.create(user=self.user, album=album, score=3)

        response = self.client.get(f"/api/catalog/album-ratings/{album.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["rating"]["albumId"], album.id)

    def test_clear_album_rating_removes_row(self):
        self.client.force_login(self.user)
        album = self._create_album()
        AlbumRating.objects.create(user=self.user, album=album, score=3)

        response = self.client.delete(f"/api/catalog/album-ratings/{album.id}")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["rating"])
        self.assertEqual(AlbumRating.objects.count(), 0)

    def test_list_rating_comments_returns_empty(self):
        self.client.force_login(self.user)
        music = self._create_music()
        rating = Rating.objects.create(user=self.user, music=music, score=4)

        response = self.client.get(f"/api/catalog/music-ratings/{rating.id}/comments")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"], [])

    def test_create_rating_comment_and_list_thread(self):
        owner = self.user
        commenter = get_user_model().objects.create_user(
            email="fan@example.com",
            password="StrongPass123!",
        )
        music = self._create_music()
        rating = Rating.objects.create(user=owner, music=music, score=5, review="Bold.")

        self.client.force_login(commenter)
        first = self.client.post(
            f"/api/catalog/music-ratings/{rating.id}/comments",
            data={"body": "Fully agree."},
            content_type="application/json",
        )
        self.assertEqual(first.status_code, 200)
        parent_id = first.json()["comment"]["id"]

        second = self.client.post(
            f"/api/catalog/music-ratings/{rating.id}/comments",
            data={"body": "Same here.", "parent_id": parent_id},
            content_type="application/json",
        )
        self.assertEqual(second.status_code, 200)

        list_response = self.client.get(
            f"/api/catalog/music-ratings/{rating.id}/comments",
        )
        self.assertEqual(list_response.status_code, 200)
        items = list_response.json()["items"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["body"], "Fully agree.")
        self.assertEqual(len(items[0]["replies"]), 1)
        self.assertEqual(items[0]["replies"][0]["body"], "Same here.")

    def test_rating_comment_rejects_nested_reply(self):
        owner = self.user
        commenter = get_user_model().objects.create_user(
            email="fan2@example.com",
            password="StrongPass123!",
        )
        music = self._create_music()
        rating = Rating.objects.create(user=owner, music=music, score=3)
        root = RatingComment.objects.create(
            rating=rating, user=commenter, body="Root"
        )
        reply = RatingComment.objects.create(
            rating=rating, user=owner, parent=root, body="Reply"
        )

        self.client.force_login(commenter)
        response = self.client.post(
            f"/api/catalog/music-ratings/{rating.id}/comments",
            data={"body": "Too deep", "parent_id": reply.id},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json()["detail"],
            "You can only reply to a top-level comment.",
        )

    def test_delete_own_rating_comment(self):
        self.client.force_login(self.user)
        music = self._create_music()
        rating = Rating.objects.create(user=self.user, music=music, score=4)
        comment = RatingComment.objects.create(
            rating=rating, user=self.user, body="Scratch that"
        )

        response = self.client.delete(
            f"/api/catalog/music-ratings/comments/{comment.id}",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(RatingComment.objects.count(), 0)

    def _create_music(self):
        artist = Artist.objects.create(
            name="Lin-Manuel Miranda",
            source_provider="musicbrainz",
            external_id="artist-1",
        )
        return Music.objects.create(
            title="My Shot",
            primary_artist=artist,
            source_provider="musicbrainz",
            external_id="recording-1",
        )

    def _create_album(self):
        artist = Artist.objects.create(
            name="Lin-Manuel Miranda",
            source_provider="musicbrainz",
            external_id="artist-album-1",
        )
        return Album.objects.create(
            title="Hamilton",
            primary_artist=artist,
            source_provider="musicbrainz",
            external_id="release-1",
            release_date="2015-09-25",
        )


class CatalogImportServiceTests(TestCase):
    def test_import_album_creates_artist_and_album(self):
        from catalog.services import import_catalog_item

        provider_item = {
            "type": "album",
            "sourceProvider": "musicbrainz",
            "externalId": "release-1",
            "title": "Hamilton",
            "artistName": "Original Broadway Cast",
            "artworkUrl": "https://img.example/hamilton.jpg",
            "releaseDate": "2015-09-25",
            "metadata": {},
        }

        with patch("catalog.services.get_catalog_provider") as provider_factory:
            provider_factory.return_value.fetch_item.return_value = provider_item

            payload = import_catalog_item(
                source_provider="musicbrainz",
                external_id="release-1",
                item_type="album",
            )

        self.assertEqual(Artist.objects.count(), 1)
        self.assertEqual(Album.objects.count(), 1)
        album = Album.objects.get()
        self.assertEqual(album.title, "Hamilton")
        self.assertEqual(album.primary_artist.name, "Original Broadway Cast")
        self.assertEqual(payload["item"]["id"], album.id)
        self.assertTrue(payload["item"]["imported"])

    def test_import_track_is_idempotent_and_links_album(self):
        from catalog.services import import_catalog_item

        provider_item = {
            "type": "track",
            "sourceProvider": "musicbrainz",
            "externalId": "recording-1",
            "title": "My Shot",
            "artistName": "Lin-Manuel Miranda",
            "artworkUrl": "https://img.example/my-shot.jpg",
            "releaseDate": "2015-09-25",
            "durationSeconds": 333,
            "album": {
                "externalId": "release-1",
                "title": "Hamilton",
                "artworkUrl": "https://img.example/hamilton.jpg",
                "releaseDate": "2015-09-25",
            },
            "metadata": {},
        }

        with patch("catalog.services.get_catalog_provider") as provider_factory:
            provider_factory.return_value.fetch_item.return_value = provider_item

            first_payload = import_catalog_item(
                source_provider="musicbrainz",
                external_id="recording-1",
                item_type="track",
            )
            second_payload = import_catalog_item(
                source_provider="musicbrainz",
                external_id="recording-1",
                item_type="track",
            )

        self.assertEqual(Artist.objects.count(), 1)
        self.assertEqual(Album.objects.count(), 1)
        self.assertEqual(Music.objects.count(), 1)

        music = Music.objects.get()
        self.assertEqual(music.album.title, "Hamilton")
        self.assertEqual(music.duration_seconds, 333)
        self.assertEqual(first_payload["item"]["id"], second_payload["item"]["id"])

    @patch("catalog.services.get_catalog_provider")
    def test_import_rejects_unsupported_provider(self, provider_factory):
        from catalog.services import import_catalog_item

        provider_factory.side_effect = ValueError("Unsupported provider.")

        with self.assertRaisesMessage(ValueError, "Unsupported provider."):
            import_catalog_item(
                source_provider="unknown",
                external_id="x",
                item_type="album",
            )

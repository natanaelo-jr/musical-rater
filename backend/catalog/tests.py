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

    def test_recommendations_require_authentication(self):
        response = self.client.get("/api/catalog/recommendations")

        self.assertEqual(response.status_code, 401)

    def test_recommendations_use_artist_affinity_and_exclude_interacted_tracks(self):
        self.client.force_login(self.user)
        artist = self._create_artist("Affinity Artist", "affinity-artist")
        liked = self._create_music_item("Known Song", "known-song", artist=artist)
        candidate = self._create_music_item(
            "Recommended Song", "recommended-song", artist=artist
        )
        Rating.objects.create(user=self.user, music=liked, score=5)

        response = self.client.get("/api/catalog/recommendations")

        self.assertEqual(response.status_code, 200)
        item_titles = [item["title"] for item in response.json()["items"]]
        self.assertIn(candidate.title, item_titles)
        self.assertNotIn(liked.title, item_titles)
        self.assertEqual(response.json()["items"][0]["musicId"], candidate.id)
        self.assertEqual(
            response.json()["items"][0]["reason"],
            "Because you liked Affinity Artist",
        )

    def test_recommendations_use_collaborative_overlap(self):
        self.client.force_login(self.user)
        peer = get_user_model().objects.create_user(
            email="peer@example.com",
            password="StrongPass123!",
        )
        artist = self._create_artist("Overlap Artist", "overlap-artist")
        shared = self._create_music_item("Shared Favorite", "shared-favorite", artist)
        candidate = self._create_music_item("Peer Pick", "peer-pick", artist)
        Favorite.objects.create(user=self.user, music=shared)
        Favorite.objects.create(user=peer, music=shared)
        Rating.objects.create(user=peer, music=candidate, score=5)

        response = self.client.get("/api/catalog/recommendations")

        self.assertEqual(response.status_code, 200)
        items = response.json()["items"]
        self.assertEqual(items[0]["musicId"], candidate.id)
        self.assertEqual(
            items[0]["reason"], "Highly rated by listeners with similar taste"
        )

    def test_recommendations_fall_back_to_popular_tracks_for_cold_start(self):
        self.client.force_login(self.user)
        listener = get_user_model().objects.create_user(
            email="popular@example.com",
            password="StrongPass123!",
        )
        artist = self._create_artist("Popular Artist", "popular-artist")
        popular = self._create_music_item("Popular Song", "popular-song", artist)
        Favorite.objects.create(user=listener, music=popular)

        response = self.client.get("/api/catalog/recommendations")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"][0]["musicId"], popular.id)
        self.assertEqual(
            response.json()["items"][0]["reason"], "Popular with listeners"
        )

    def test_recommendations_respect_limit(self):
        self.client.force_login(self.user)
        listener = get_user_model().objects.create_user(
            email="limit@example.com",
            password="StrongPass123!",
        )
        artist = self._create_artist("Limit Artist", "limit-artist")
        first = self._create_music_item("First Popular", "first-popular", artist)
        second = self._create_music_item("Second Popular", "second-popular", artist)
        Favorite.objects.create(user=listener, music=first)
        Favorite.objects.create(user=listener, music=second)

        response = self.client.get("/api/catalog/recommendations", {"limit": 1})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["items"]), 1)

    def test_recommendations_reject_invalid_limit(self):
        self.client.force_login(self.user)

        response = self.client.get("/api/catalog/recommendations", {"limit": 21})

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json()["errors"]["limit"], "Limit must be 20 or less."
        )

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
        root = RatingComment.objects.create(rating=rating, user=commenter, body="Root")
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

    def test_song_detail_returns_stats_and_reviews(self):
        self.client.force_login(self.user)
        music = self._create_music()
        other_user = get_user_model().objects.create_user(
            email="critic@example.com",
            password="StrongPass123!",
        )
        other_user.profile.display_name = "Critic"
        other_user.profile.username = "critic"
        other_user.profile.save(update_fields=["display_name", "username"])
        Rating.objects.create(
            user=other_user,
            music=music,
            score=5,
            review="Big chorus.",
        )
        Rating.objects.create(user=self.user, music=music, score=3, review="Solid.")

        response = self.client.get(f"/api/songs/{music.id}")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["song"]["name"], "My Shot")
        self.assertEqual(payload["stats"]["averageRating"], 4.0)
        self.assertEqual(payload["stats"]["totalReviews"], 2)
        self.assertEqual(payload["reviews"][0]["user"]["username"], "critic")

    def test_get_rating_requires_authentication(self):
        music = self._create_music()

        response = self.client.get(f"/api/catalog/ratings/{music.id}")

        self.assertEqual(response.status_code, 401)

    def test_list_ratings_requires_authentication(self):
        response = self.client.get("/api/catalog/ratings")

        self.assertEqual(response.status_code, 401)

    def test_clear_rating_requires_authentication(self):
        music = self._create_music()

        response = self.client.delete(f"/api/catalog/ratings/{music.id}")

        self.assertEqual(response.status_code, 401)

    def test_get_rating_returns_null_when_not_rated(self):
        self.client.force_login(self.user)
        music = self._create_music()

        response = self.client.get(f"/api/catalog/ratings/{music.id}")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["rating"])

    def test_get_rating_returns_404_for_unknown_music(self):
        self.client.force_login(self.user)

        response = self.client.get("/api/catalog/ratings/999999")

        self.assertEqual(response.status_code, 404)

    def test_save_rating_returns_404_for_unknown_music(self):
        self.client.force_login(self.user)

        response = self.client.post(
            "/api/catalog/ratings/999999",
            data={"score": 4},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 404)

    def test_clear_rating_returns_404_for_unknown_music(self):
        self.client.force_login(self.user)

        response = self.client.delete("/api/catalog/ratings/999999")

        self.assertEqual(response.status_code, 404)

    def test_save_rating_rejects_score_below_minimum(self):
        self.client.force_login(self.user)
        music = self._create_music()

        response = self.client.post(
            f"/api/catalog/ratings/{music.id}",
            data={"score": 0},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json()["errors"]["score"], "Score must be between 1 and 5."
        )

    def test_save_rating_accepts_boundary_scores(self):
        self.client.force_login(self.user)
        music = self._create_music()

        low = self.client.post(
            f"/api/catalog/ratings/{music.id}",
            data={"score": 1},
            content_type="application/json",
        )
        high = self.client.post(
            f"/api/catalog/ratings/{music.id}",
            data={"score": 5},
            content_type="application/json",
        )

        self.assertEqual(low.json()["rating"]["score"], 1)
        self.assertEqual(high.json()["rating"]["score"], 5)

    def test_save_rating_accepts_review_at_max_length(self):
        self.client.force_login(self.user)
        music = self._create_music()

        response = self.client.post(
            f"/api/catalog/ratings/{music.id}",
            data={"score": 3, "review": "x" * 2000},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(Rating.objects.get().review), 2000)

    def test_save_rating_trims_review_whitespace(self):
        self.client.force_login(self.user)
        music = self._create_music()

        response = self.client.post(
            f"/api/catalog/ratings/{music.id}",
            data={"score": 4, "review": "  Sharp and precise.  "},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Rating.objects.get().review, "Sharp and precise.")

    def test_rating_is_scoped_to_current_user(self):
        other_user = get_user_model().objects.create_user(
            email="other@example.com",
            password="StrongPass123!",
        )
        music = self._create_music()
        Rating.objects.create(user=other_user, music=music, score=5, review="Theirs.")
        self.client.force_login(self.user)

        response = self.client.get(f"/api/catalog/ratings/{music.id}")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["rating"])

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

    def _create_artist(self, name, external_id):
        return Artist.objects.create(
            name=name,
            source_provider="musicbrainz",
            external_id=external_id,
        )

    def _create_music_item(self, title, external_id, artist, album=None):
        return Music.objects.create(
            title=title,
            primary_artist=artist,
            album=album,
            source_provider="musicbrainz",
            external_id=external_id,
        )


class CatalogImportServiceTests(TestCase):
    def test_search_includes_local_id_for_imported_track(self):
        from catalog.services import search_catalog

        artist = Artist.objects.create(
            name="Lin-Manuel Miranda",
            source_provider="deezer",
            external_id="artist:lin-manuel miranda",
        )
        music = Music.objects.create(
            title="My Shot",
            primary_artist=artist,
            source_provider="deezer",
            external_id="3135556",
            cover_url="https://img.example/local.jpg",
        )
        provider_result = {
            "type": "track",
            "sourceProvider": "deezer",
            "externalId": "3135556",
            "title": "My Shot",
            "artistName": "Lin-Manuel Miranda",
            "artworkUrl": "https://img.example/provider.jpg",
            "releaseDate": "2015-09-25",
        }

        with patch("catalog.services.get_catalog_provider") as provider_factory:
            provider_factory.return_value.search.return_value = {
                "items": [provider_result],
                "page": 1,
                "hasNextPage": False,
            }

            payload = search_catalog(query="my shot", result_type="track", page=1)

        item = payload["items"][0]
        self.assertTrue(item["imported"])
        self.assertEqual(item["id"], music.id)
        self.assertEqual(item["artworkUrl"], "https://img.example/local.jpg")

    def test_search_includes_local_id_for_imported_album(self):
        from catalog.services import search_catalog

        artist = Artist.objects.create(
            name="Original Broadway Cast",
            source_provider="deezer",
            external_id="artist:original broadway cast",
        )
        album = Album.objects.create(
            title="Hamilton",
            primary_artist=artist,
            source_provider="deezer",
            external_id="302127",
            release_date="2015-09-25",
        )
        provider_result = {
            "type": "album",
            "sourceProvider": "deezer",
            "externalId": "302127",
            "title": "Hamilton",
            "artistName": "Original Broadway Cast",
            "artworkUrl": "",
            "releaseDate": "2015-09-25",
        }

        with patch("catalog.services.get_catalog_provider") as provider_factory:
            provider_factory.return_value.search.return_value = {
                "items": [provider_result],
                "page": 1,
                "hasNextPage": False,
            }

            payload = search_catalog(query="hamilton", result_type="album", page=1)

        item = payload["items"][0]
        self.assertTrue(item["imported"])
        self.assertEqual(item["id"], album.id)

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


class CatalogProviderTests(TestCase):
    def test_get_catalog_provider_returns_supported_providers(self):
        from catalog.providers import (
            DeezerSearchProvider,
            MusicBrainzSearchProvider,
            get_catalog_provider,
        )

        self.assertIsInstance(get_catalog_provider("deezer"), DeezerSearchProvider)
        self.assertIsInstance(
            get_catalog_provider("musicbrainz"), MusicBrainzSearchProvider
        )
        with self.assertRaisesMessage(ValueError, "Unsupported provider."):
            get_catalog_provider("unknown")

    def test_deezer_search_all_combines_album_and_track_results(self):
        from catalog.providers import DeezerSearchProvider

        provider = DeezerSearchProvider()
        payloads = {
            "/search/album": {
                "data": [
                    {
                        "id": 302127,
                        "title": "Hamilton",
                        "release_date": "2015-09-25",
                        "nb_tracks": 46,
                        "cover_medium": "https://img.example/album.jpg",
                        "artist": {"name": "Original Broadway Cast"},
                    }
                ],
                "total": 6,
            },
            "/search/track": {
                "data": [
                    {
                        "id": 3135556,
                        "title": "My Shot",
                        "duration": 333,
                        "release_date": "2015-09-25",
                        "artist": {"name": "Lin-Manuel Miranda"},
                        "album": {
                            "id": 302127,
                            "title": "Hamilton",
                            "cover_medium": "https://img.example/track.jpg",
                            "release_date": "2015-09-25",
                        },
                    }
                ],
                "total": 1,
            },
        }

        with patch.object(provider, "_request_json") as request_json:
            request_json.side_effect = lambda path, params=None: payloads[path]

            payload = provider.search(query="hamilton", result_type="all", page=1)

        self.assertEqual(payload["page"], 1)
        self.assertTrue(payload["hasNextPage"])
        self.assertEqual(
            [item["type"] for item in payload["items"]], ["album", "track"]
        )
        self.assertEqual(payload["items"][0]["metadata"]["trackCount"], 46)
        self.assertEqual(payload["items"][1]["durationSeconds"], 333)
        self.assertEqual(payload["items"][1]["album"]["externalId"], "302127")
        request_json.assert_any_call(
            "/search/album", {"q": "hamilton", "index": 0, "limit": 5}
        )
        request_json.assert_any_call(
            "/search/track", {"q": "hamilton", "index": 0, "limit": 5}
        )

    def test_deezer_fetch_item_normalizes_album_and_track(self):
        from catalog.providers import DeezerSearchProvider

        provider = DeezerSearchProvider()
        payloads = {
            "/album/302127": {
                "id": 302127,
                "title": "Hamilton",
                "release_date": "2015-09-25",
                "nb_tracks": 46,
                "cover_xl": "https://img.example/album-xl.jpg",
                "artist": {"name": "Original Broadway Cast"},
            },
            "/track/3135556": {
                "id": 3135556,
                "title": "My Shot",
                "duration": 333,
                "release_date": "2015-09-25",
                "artist": {"name": "Lin-Manuel Miranda"},
                "album": {
                    "id": 302127,
                    "title": "Hamilton",
                    "cover_xl": "https://img.example/track-xl.jpg",
                    "release_date": "2015-09-25",
                },
            },
        }

        with patch.object(provider, "_request_json") as request_json:
            request_json.side_effect = lambda path, params=None: payloads[path]

            album = provider.fetch_item("album", "302127")
            track = provider.fetch_item("track", "3135556")

        self.assertEqual(album["sourceProvider"], "deezer")
        self.assertEqual(album["artworkUrl"], "https://img.example/album-xl.jpg")
        self.assertEqual(track["album"]["title"], "Hamilton")
        self.assertEqual(track["artworkUrl"], "https://img.example/track-xl.jpg")
        with self.assertRaisesMessage(ValueError, "Unsupported item type."):
            provider.fetch_item("artist", "1")

    def test_musicbrainz_search_and_fetch_normalize_payloads(self):
        from catalog.providers import MusicBrainzSearchProvider

        provider = MusicBrainzSearchProvider()
        payloads = {
            "/release": {
                "releases": [
                    {
                        "id": "release-1",
                        "title": "Hamilton",
                        "date": "2015-09-25",
                        "country": "US",
                        "track-count": 46,
                        "artist-credit": [{"name": "Original Broadway Cast"}],
                    }
                ],
                "count": 11,
            },
            "/recording": {
                "recordings": [
                    {
                        "id": "recording-1",
                        "title": "My Shot",
                        "length": 333000,
                        "artist-credit": [{"name": "Lin-Manuel Miranda"}],
                        "releases": [
                            {
                                "id": "release-1",
                                "title": "Hamilton",
                                "date": "2015-09-25",
                            }
                        ],
                    }
                ],
                "count": 1,
            },
            "/release/release-1": {
                "id": "release-1",
                "title": "Hamilton",
                "artist-credit": [{"name": "Original Broadway Cast"}],
            },
            "/recording/recording-1": {
                "id": "recording-1",
                "title": "My Shot",
                "length": 333000,
                "artist-credit": [{"name": "Lin-Manuel Miranda"}],
                "releases": [],
            },
        }

        with patch.object(provider, "_request_json") as request_json:
            request_json.side_effect = lambda path, params=None: payloads[path]

            search_payload = provider.search(
                query="hamilton", result_type="all", page=1
            )
            album = provider.fetch_item("album", "release-1")
            track = provider.fetch_item("track", "recording-1")

        self.assertTrue(search_payload["hasNextPage"])
        self.assertEqual(search_payload["items"][0]["type"], "album")
        self.assertEqual(search_payload["items"][1]["durationSeconds"], 333)
        self.assertEqual(album["externalId"], "release-1")
        self.assertEqual(track["album"], None)
        request_json.assert_any_call(
            "/release", {"query": "hamilton", "fmt": "json", "limit": 5, "offset": 0}
        )
        request_json.assert_any_call(
            "/recording",
            {"query": "hamilton", "fmt": "json", "limit": 5, "offset": 0},
        )

    def test_providers_reject_unsupported_search_types(self):
        from catalog.providers import DeezerSearchProvider, MusicBrainzSearchProvider

        with self.assertRaisesMessage(ValueError, "Unsupported result type."):
            DeezerSearchProvider().search(
                query="hamilton", result_type="artist", page=1
            )
        with self.assertRaisesMessage(ValueError, "Unsupported result type."):
            MusicBrainzSearchProvider().search(
                query="hamilton", result_type="artist", page=1
            )

    def test_musicbrainz_helpers_handle_empty_and_invalid_values(self):
        from catalog.providers import MusicBrainzSearchProvider

        provider = MusicBrainzSearchProvider()

        self.assertEqual(provider._artist_name([]), "")
        self.assertEqual(provider._artist_name(["Company"]), "Company")
        self.assertEqual(provider._duration_seconds(None), None)
        self.assertEqual(provider._duration_seconds(-1), None)
        self.assertEqual(provider._cover_art_url(""), "")

    @patch("catalog.providers.urlopen")
    def test_deezer_request_json_builds_url_and_decodes_response(self, urlopen_mock):
        from catalog.providers import DeezerSearchProvider

        urlopen_mock.return_value.__enter__.return_value.read.return_value = (
            b'{"ok": true}'
        )

        payload = DeezerSearchProvider(base_url="https://api.example")._request_json(
            "/search/album", {"q": "my shot", "limit": 10}
        )

        request = urlopen_mock.call_args.args[0]
        self.assertEqual(payload, {"ok": True})
        self.assertEqual(
            request.full_url,
            "https://api.example/search/album?q=my+shot&limit=10",
        )
        self.assertEqual(request.headers["Accept"], "application/json")

    @patch.dict("os.environ", {"MUSICBRAINZ_USER_AGENT": "palhinha/0.1 ( https://github.com/natanaelo-jr/musical-rater )"})
    @patch("catalog.providers.urlopen")
    def test_musicbrainz_request_json_adds_format_and_user_agent(self, urlopen_mock):
        from catalog.providers import MusicBrainzSearchProvider

        urlopen_mock.return_value.__enter__.return_value.read.return_value = (
            b'{"ok": true}'
        )

        payload = MusicBrainzSearchProvider(
            base_url="https://music.example"
        )._request_json("/release/release-1")

        request = urlopen_mock.call_args.args[0]
        self.assertEqual(payload, {"ok": True})
        self.assertEqual(
            request.full_url,
            "https://music.example/release/release-1?fmt=json",
        )
        self.assertEqual(request.headers["Accept"], "application/json")
        self.assertIn("palhinha/0.1", request.headers["User-agent"])

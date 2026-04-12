from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from catalog.models import Album, Artist, Music


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

        response = self.client.get("/api/catalog/search", {"q": "hamilton", "type": "album"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["items"][0]["title"], "Hamilton")
        search_catalog_mock.assert_called_once_with(query="hamilton", result_type="album", page=1)

    def test_search_rejects_blank_query(self):
        self.client.force_login(self.user)

        response = self.client.get("/api/catalog/search", {"q": " "})

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["errors"]["q"], "Query must have at least 2 characters.")

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

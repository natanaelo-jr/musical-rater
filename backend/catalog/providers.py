import json
import os
from dataclasses import dataclass
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class CatalogSearchProvider:
    def search(self, query: str, result_type: str, page: int):
        raise NotImplementedError

    def fetch_item(self, item_type: str, external_id: str):
        raise NotImplementedError


@dataclass
class MusicBrainzSearchProvider(CatalogSearchProvider):
    base_url: str = "https://musicbrainz.org/ws/2"
    page_size: int = 10

    def search(self, query: str, result_type: str, page: int):
        if result_type == "all":
            album_results = self._search_releases(query=query, page=page, limit=5)
            track_results = self._search_recordings(query=query, page=page, limit=5)
            return {
                "items": album_results["items"] + track_results["items"],
                "page": page,
                "hasNextPage": album_results["hasNextPage"]
                or track_results["hasNextPage"],
            }
        if result_type == "album":
            return self._search_releases(query=query, page=page, limit=self.page_size)
        if result_type == "track":
            return self._search_recordings(query=query, page=page, limit=self.page_size)
        raise ValueError("Unsupported result type.")

    def fetch_item(self, item_type: str, external_id: str):
        if item_type == "album":
            payload = self._request_json(
                f"/release/{external_id}", {"inc": "artist-credits"}
            )
            return self._normalize_release(payload)
        if item_type == "track":
            payload = self._request_json(
                f"/recording/{external_id}",
                {"inc": "artist-credits+releases"},
            )
            return self._normalize_recording(payload)
        raise ValueError("Unsupported item type.")

    def _search_releases(self, query: str, page: int, limit: int):
        offset = max(page - 1, 0) * limit
        payload = self._request_json(
            "/release",
            {"query": query, "fmt": "json", "limit": limit, "offset": offset},
        )
        items = [
            self._normalize_release(release) for release in payload.get("releases", [])
        ]
        total = int(payload.get("count", len(items)))
        return {"items": items, "page": page, "hasNextPage": offset + limit < total}

    def _search_recordings(self, query: str, page: int, limit: int):
        offset = max(page - 1, 0) * limit
        payload = self._request_json(
            "/recording",
            {"query": query, "fmt": "json", "limit": limit, "offset": offset},
        )
        items = [
            self._normalize_recording(recording)
            for recording in payload.get("recordings", [])
        ]
        total = int(payload.get("count", len(items)))
        return {"items": items, "page": page, "hasNextPage": offset + limit < total}

    def _request_json(self, path: str, params: dict[str, object] | None = None):
        query = params or {}
        query.setdefault("fmt", "json")
        url = f"{self.base_url}{path}?{urlencode(query)}"
        request = Request(
            url,
            headers={
                "Accept": "application/json",
                "User-Agent": os.getenv(
                    "MUSICBRAINZ_USER_AGENT",
                    "musical-rater/0.1 ( https://github.com/natanaelo-jr/musical-rater )",
                ),
            },
        )
        with urlopen(request, timeout=10) as response:  # noqa: S310
            return json.loads(response.read().decode("utf-8"))

    def _normalize_release(self, release: dict[str, object]):
        artist_credit = release.get("artist-credit", [])
        artist_name = self._artist_name(artist_credit)
        external_id = str(release.get("id", ""))
        return {
            "type": "album",
            "sourceProvider": "musicbrainz",
            "externalId": external_id,
            "title": str(release.get("title", "")),
            "artistName": artist_name,
            "artworkUrl": self._cover_art_url(external_id),
            "releaseDate": str(release.get("date", "")),
            "imported": False,
            "metadata": {
                "country": str(release.get("country", "")),
                "trackCount": release.get("track-count"),
            },
        }

    def _normalize_recording(self, recording: dict[str, object]):
        artist_credit = recording.get("artist-credit", [])
        releases = recording.get("releases", [])
        primary_release = releases[0] if releases else {}
        release_id = str(primary_release.get("id", ""))
        return {
            "type": "track",
            "sourceProvider": "musicbrainz",
            "externalId": str(recording.get("id", "")),
            "title": str(recording.get("title", "")),
            "artistName": self._artist_name(artist_credit),
            "artworkUrl": self._cover_art_url(release_id),
            "releaseDate": str(
                primary_release.get("date", recording.get("first-release-date", ""))
            ),
            "durationSeconds": self._duration_seconds(recording.get("length")),
            "album": {
                "externalId": release_id,
                "title": str(primary_release.get("title", "")),
                "artworkUrl": self._cover_art_url(release_id),
                "releaseDate": str(primary_release.get("date", "")),
            }
            if release_id
            else None,
            "imported": False,
            "metadata": {},
        }

    def _artist_name(self, artist_credit):
        if not artist_credit:
            return ""
        first_credit = artist_credit[0]
        if isinstance(first_credit, dict):
            return str(first_credit.get("name", ""))
        return str(first_credit)

    def _cover_art_url(self, release_id: str):
        if not release_id:
            return ""
        return f"https://coverartarchive.org/release/{release_id}/front-250"

    def _duration_seconds(self, length_ms):
        if not isinstance(length_ms, int) or length_ms < 0:
            return None
        return length_ms // 1000


def get_catalog_provider(source_provider: str):
    if source_provider == "musicbrainz":
        return MusicBrainzSearchProvider()
    raise ValueError("Unsupported provider.")

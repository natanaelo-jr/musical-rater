from catalog.models import Album, Artist, Music
from catalog.providers import get_catalog_provider


def search_catalog(*, query: str, result_type: str, page: int):
    provider = get_catalog_provider("musicbrainz")
    results = provider.search(query=query, result_type=result_type, page=page)

    for item in results["items"]:
        item["imported"] = _is_imported(item)

    return results


def import_catalog_item(*, source_provider: str, external_id: str, item_type: str):
    item = ensure_catalog_item(
        source_provider=source_provider,
        external_id=external_id,
        item_type=item_type,
    )

    if item_type == "album":
        return {"item": serialize_album(item)}

    return {"item": serialize_track(item)}


def ensure_catalog_item(*, source_provider: str, external_id: str, item_type: str):
    existing_item = _get_existing_item(
        source_provider=source_provider,
        external_id=external_id,
        item_type=item_type,
    )
    if existing_item:
        return existing_item

    provider = get_catalog_provider(source_provider)
    item = provider.fetch_item(item_type=item_type, external_id=external_id)

    if item_type == "album":
        return _import_album(item)

    return _import_track(item)


def serialize_album(album: Album):
    return {
        "type": "album",
        "id": album.id,
        "sourceProvider": album.source_provider,
        "externalId": album.external_id,
        "title": album.title,
        "artistName": album.primary_artist.name,
        "artworkUrl": album.cover_url,
        "releaseDate": album.release_date,
        "imported": True,
    }


def serialize_track(music: Music):
    payload = {
        "type": "track",
        "id": music.id,
        "sourceProvider": music.source_provider,
        "externalId": music.external_id,
        "title": music.title,
        "artistName": music.primary_artist.name,
        "artworkUrl": music.cover_url,
        "releaseDate": music.release_date,
        "imported": True,
    }
    if music.album_id:
        payload["albumTitle"] = music.album.title
    return payload


def _is_imported(item: dict[str, object]):
    if item["type"] == "album":
        return Album.objects.filter(
            source_provider=item["sourceProvider"],
            external_id=item["externalId"],
        ).exists()

    return Music.objects.filter(
        source_provider=item["sourceProvider"],
        external_id=item["externalId"],
    ).exists()


def _get_existing_item(*, source_provider: str, external_id: str, item_type: str):
    if item_type == "album":
        return (
            Album.objects.select_related("primary_artist")
            .filter(source_provider=source_provider, external_id=external_id)
            .first()
        )

    if item_type == "track":
        return (
            Music.objects.select_related("primary_artist", "album")
            .filter(source_provider=source_provider, external_id=external_id)
            .first()
        )

    raise ValueError("Unsupported item type.")


def _import_album(item: dict[str, object]):
    artist = _get_or_create_artist(
        source_provider=item["sourceProvider"],
        external_id=f"artist:{item['artistName'].lower()}",
        name=item["artistName"],
        image_url="",
    )
    album, defaults = Album.objects.get_or_create(
        source_provider=item["sourceProvider"],
        external_id=item["externalId"],
        defaults={
            "title": item["title"],
            "primary_artist": artist,
            "release_date": item.get("releaseDate", ""),
            "cover_url": item.get("artworkUrl", ""),
        },
    )
    if defaults is False:
        return album
    return album


def _import_track(item: dict[str, object]):
    artist = _get_or_create_artist(
        source_provider=item["sourceProvider"],
        external_id=f"artist:{item['artistName'].lower()}",
        name=item["artistName"],
        image_url="",
    )
    album_payload = item.get("album")
    album = None
    if isinstance(album_payload, dict) and album_payload.get("externalId"):
        album, _ = Album.objects.get_or_create(
            source_provider=item["sourceProvider"],
            external_id=album_payload["externalId"],
            defaults={
                "title": album_payload.get("title", ""),
                "primary_artist": artist,
                "release_date": album_payload.get("releaseDate", ""),
                "cover_url": album_payload.get("artworkUrl", ""),
            },
        )

    music, created = Music.objects.get_or_create(
        source_provider=item["sourceProvider"],
        external_id=item["externalId"],
        defaults={
            "title": item["title"],
            "primary_artist": artist,
            "album": album,
            "duration_seconds": item.get("durationSeconds"),
            "release_date": item.get("releaseDate", ""),
            "cover_url": item.get("artworkUrl", ""),
        },
    )
    if not created and album and music.album_id is None:
        music.album = album
        music.save(update_fields=["album", "updated_at"])
    return music


def _get_or_create_artist(
    *, source_provider: str, external_id: str, name: str, image_url: str
):
    artist, _ = Artist.objects.get_or_create(
        source_provider=source_provider,
        external_id=external_id,
        defaults={"name": name, "image_url": image_url},
    )
    return artist

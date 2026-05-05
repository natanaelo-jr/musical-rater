from collections import defaultdict

from django.db.models import Avg, Count, Q

from catalog.models import (
    Album,
    AlbumRating,
    Artist,
    Favorite,
    Music,
    Rating,
    SavedAlbum,
)
from catalog.providers import get_catalog_provider


POSITIVE_RATING_MIN_SCORE = 4


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


def recommend_songs_for_user(*, user, limit: int = 8):
    excluded_music_ids = set(
        Rating.objects.filter(user=user).values_list("music_id", flat=True)
    )
    excluded_music_ids.update(
        Favorite.objects.filter(user=user).values_list("music_id", flat=True)
    )

    positive_ratings = list(
        Rating.objects.filter(user=user, score__gte=POSITIVE_RATING_MIN_SCORE)
        .select_related("music", "music__primary_artist", "music__album")
        .order_by("-updated_at")
    )
    favorites = list(
        Favorite.objects.filter(user=user)
        .select_related("music", "music__primary_artist", "music__album")
        .order_by("-created_at")
    )
    album_ratings = list(
        AlbumRating.objects.filter(user=user, score__gte=POSITIVE_RATING_MIN_SCORE)
        .select_related("album", "album__primary_artist")
        .order_by("-updated_at")
    )
    saved_albums = list(
        SavedAlbum.objects.filter(user=user)
        .select_related("album", "album__primary_artist")
        .order_by("-created_at")
    )

    scores: dict[int, float] = defaultdict(float)
    reasons: dict[int, str] = {}
    reason_priorities: dict[int, int] = defaultdict(int)

    artist_weights: dict[int, float] = defaultdict(float)
    artist_names: dict[int, str] = {}
    album_weights: dict[int, float] = defaultdict(float)
    album_titles: dict[int, str] = {}
    liked_music_ids = set()

    for rating in positive_ratings:
        music = rating.music
        liked_music_ids.add(music.id)
        artist_weights[music.primary_artist_id] += rating.score
        artist_names[music.primary_artist_id] = music.primary_artist.name
        if music.album_id:
            album_weights[music.album_id] += rating.score
            album_titles[music.album_id] = music.album.title

    for favorite in favorites:
        music = favorite.music
        liked_music_ids.add(music.id)
        artist_weights[music.primary_artist_id] += 5
        artist_names[music.primary_artist_id] = music.primary_artist.name
        if music.album_id:
            album_weights[music.album_id] += 5
            album_titles[music.album_id] = music.album.title

    for album_rating in album_ratings:
        album = album_rating.album
        artist_weights[album.primary_artist_id] += album_rating.score
        artist_names[album.primary_artist_id] = album.primary_artist.name
        album_weights[album.id] += album_rating.score
        album_titles[album.id] = album.title

    for saved_album in saved_albums:
        album = saved_album.album
        artist_weights[album.primary_artist_id] += 3
        artist_names[album.primary_artist_id] = album.primary_artist.name
        album_weights[album.id] += 3
        album_titles[album.id] = album.title

    if artist_weights or album_weights:
        affinity_candidates = (
            Music.objects.filter(
                Q(primary_artist_id__in=artist_weights.keys())
                | Q(album_id__in=album_weights.keys())
            )
            .exclude(id__in=excluded_music_ids)
            .select_related("primary_artist", "album")
        )
        for music in affinity_candidates:
            artist_weight = artist_weights.get(music.primary_artist_id, 0)
            album_weight = album_weights.get(music.album_id, 0)
            if artist_weight:
                _add_recommendation(
                    scores=scores,
                    reasons=reasons,
                    reason_priorities=reason_priorities,
                    music_id=music.id,
                    score=artist_weight * 2,
                    reason=f"Because you liked {artist_names[music.primary_artist_id]}",
                    priority=20,
                )
            if album_weight and music.album_id:
                _add_recommendation(
                    scores=scores,
                    reasons=reasons,
                    reason_priorities=reason_priorities,
                    music_id=music.id,
                    score=album_weight * 2.5,
                    reason=f"More from {album_titles[music.album_id]}",
                    priority=25,
                )

    if liked_music_ids:
        similar_user_ids = _similar_user_ids(user=user, music_ids=liked_music_ids)
        if similar_user_ids:
            _score_collaborative_candidates(
                user_ids=similar_user_ids,
                excluded_music_ids=excluded_music_ids,
                scores=scores,
                reasons=reasons,
                reason_priorities=reason_priorities,
            )

    if len(scores) < limit:
        _score_popular_candidates(
            excluded_music_ids=excluded_music_ids,
            scores=scores,
            reasons=reasons,
            reason_priorities=reason_priorities,
        )

    if not scores:
        return {"items": []}

    music_by_id = Music.objects.select_related("primary_artist", "album").in_bulk(
        scores.keys()
    )
    ranked_music_ids = sorted(
        scores.keys(),
        key=lambda music_id: (
            -scores[music_id],
            music_by_id[music_id].title.lower() if music_id in music_by_id else "",
        ),
    )

    items = []
    for music_id in ranked_music_ids:
        music = music_by_id.get(music_id)
        if music is None:
            continue
        items.append(
            {
                "musicId": music.id,
                "title": music.title,
                "artistName": music.primary_artist.name,
                "albumTitle": music.album.title if music.album_id else "",
                "artworkUrl": music.cover_url,
                "score": round(scores[music_id], 2),
                "reason": reasons.get(music_id, "Recommended from your taste"),
            }
        )
        if len(items) >= limit:
            break

    return {"items": items}


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


def _add_recommendation(
    *,
    scores,
    reasons,
    reason_priorities,
    music_id: int,
    score: float,
    reason: str,
    priority: int,
):
    scores[music_id] += score
    if priority > reason_priorities[music_id]:
        reasons[music_id] = reason
        reason_priorities[music_id] = priority


def _similar_user_ids(*, user, music_ids: set[int]):
    favorite_user_ids = Favorite.objects.filter(music_id__in=music_ids).exclude(
        user=user
    )
    rating_user_ids = Rating.objects.filter(
        music_id__in=music_ids,
        score__gte=POSITIVE_RATING_MIN_SCORE,
    ).exclude(user=user)

    return set(favorite_user_ids.values_list("user_id", flat=True)) | set(
        rating_user_ids.values_list("user_id", flat=True)
    )


def _score_collaborative_candidates(
    *,
    user_ids: set[int],
    excluded_music_ids: set[int],
    scores,
    reasons,
    reason_priorities,
):
    favorite_candidates = (
        Favorite.objects.filter(user_id__in=user_ids)
        .exclude(music_id__in=excluded_music_ids)
        .values("music_id")
        .annotate(listener_count=Count("user_id", distinct=True))
    )
    for candidate in favorite_candidates:
        _add_recommendation(
            scores=scores,
            reasons=reasons,
            reason_priorities=reason_priorities,
            music_id=candidate["music_id"],
            score=candidate["listener_count"] * 6,
            reason="Liked by listeners with similar taste",
            priority=30,
        )

    rating_candidates = (
        Rating.objects.filter(
            user_id__in=user_ids,
            score__gte=POSITIVE_RATING_MIN_SCORE,
        )
        .exclude(music_id__in=excluded_music_ids)
        .values("music_id")
        .annotate(
            listener_count=Count("user_id", distinct=True), avg_score=Avg("score")
        )
    )
    for candidate in rating_candidates:
        _add_recommendation(
            scores=scores,
            reasons=reasons,
            reason_priorities=reason_priorities,
            music_id=candidate["music_id"],
            score=float(candidate["avg_score"]) * candidate["listener_count"],
            reason="Highly rated by listeners with similar taste",
            priority=30,
        )


def _score_popular_candidates(
    *, excluded_music_ids, scores, reasons, reason_priorities
):
    popular_favorites = (
        Favorite.objects.exclude(music_id__in=excluded_music_ids)
        .values("music_id")
        .annotate(listener_count=Count("user_id", distinct=True))
    )
    for candidate in popular_favorites:
        _add_recommendation(
            scores=scores,
            reasons=reasons,
            reason_priorities=reason_priorities,
            music_id=candidate["music_id"],
            score=candidate["listener_count"] * 3,
            reason="Popular with listeners",
            priority=10,
        )

    popular_ratings = (
        Rating.objects.filter(score__gte=POSITIVE_RATING_MIN_SCORE)
        .exclude(music_id__in=excluded_music_ids)
        .values("music_id")
        .annotate(
            listener_count=Count("user_id", distinct=True), avg_score=Avg("score")
        )
    )
    for candidate in popular_ratings:
        _add_recommendation(
            scores=scores,
            reasons=reasons,
            reason_priorities=reason_priorities,
            music_id=candidate["music_id"],
            score=float(candidate["avg_score"]) * candidate["listener_count"],
            reason="Popular with listeners",
            priority=10,
        )


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

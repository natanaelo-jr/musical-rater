from django.db import models


class Artist(models.Model):
    name = models.CharField(max_length=255)
    source_provider = models.CharField(max_length=50, default="musicbrainz")
    external_id = models.CharField(max_length=255)
    image_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["source_provider", "external_id"],
                name="catalog_artist_provider_external_id_unique",
            )
        ]

    def __str__(self):
        return self.name


class Album(models.Model):
    title = models.CharField(max_length=255)
    primary_artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name="albums")
    source_provider = models.CharField(max_length=50, default="musicbrainz")
    external_id = models.CharField(max_length=255)
    release_date = models.CharField(max_length=32, blank=True)
    cover_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["source_provider", "external_id"],
                name="catalog_album_provider_external_id_unique",
            )
        ]

    def __str__(self):
        return self.title


class Music(models.Model):
    title = models.CharField(max_length=255)
    primary_artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name="tracks")
    album = models.ForeignKey(
        Album,
        on_delete=models.SET_NULL,
        related_name="tracks",
        null=True,
        blank=True,
    )
    source_provider = models.CharField(max_length=50, default="musicbrainz")
    external_id = models.CharField(max_length=255)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    release_date = models.CharField(max_length=32, blank=True)
    cover_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["source_provider", "external_id"],
                name="catalog_music_provider_external_id_unique",
            )
        ]

    def __str__(self):
        return self.title


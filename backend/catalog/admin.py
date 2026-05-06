from django.contrib import admin
from .models import Album, AlbumRating, Artist, Music, Rating, RatingComment


@admin.register(Artist)
class ArtistAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "source_provider", "external_id", "created_at")
    search_fields = ("name", "external_id")
    list_filter = ("source_provider",)


@admin.register(Album)
class AlbumAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "primary_artist",
        "source_provider",
        "release_date",
        "created_at",
    )
    search_fields = ("title", "primary_artist__name", "external_id")
    list_filter = ("source_provider", "release_date")
    autocomplete_fields = ("primary_artist",)


@admin.register(Music)
class MusicAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "primary_artist",
        "album",
        "source_provider",
        "created_at",
    )
    search_fields = ("title", "primary_artist__name", "album__title", "external_id")
    list_filter = ("source_provider",)
    autocomplete_fields = ("primary_artist", "album")


# Painel de moderação para Avaliações de Músicas
@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "music", "score", "created_at")
    search_fields = (
        "review",
        "user__email",
        "user__profile__username",
        "music__title",
    )
    list_filter = ("score", "created_at")
    autocomplete_fields = ("user", "music")
    readonly_fields = ("created_at", "updated_at")


# Painel de moderação para Avaliações de Álbuns
@admin.register(AlbumRating)
class AlbumRatingAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "album", "score", "created_at")
    search_fields = (
        "review",
        "user__email",
        "user__profile__username",
        "album__title",
    )
    list_filter = ("score", "created_at")
    autocomplete_fields = ("user", "album")
    readonly_fields = ("created_at", "updated_at")


# Painel de moderação para Comentários nas avaliações
@admin.register(RatingComment)
class RatingCommentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "rating", "created_at")
    search_fields = ("body", "user__email", "user__profile__username")
    autocomplete_fields = ("user", "rating", "parent")
    readonly_fields = ("created_at",)

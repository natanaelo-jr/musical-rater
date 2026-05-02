from django.contrib import admin
from .models import Artist, Album, Music, Rating, AlbumRating, RatingComment

# Registra Músicas, Álbuns e Artistas (Mais para o Admin)
admin.site.register(Artist)
admin.site.register(Album)
admin.site.register(Music)


# Painel de moderação para Avaliações de Músicas
@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "music", "score", "created_at")
    search_fields = ("review", "user__username", "music__title")
    list_filter = ("score", "created_at")


# Painel de moderação para Avaliações de Álbuns
@admin.register(AlbumRating)
class AlbumRatingAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "album", "score", "created_at")
    search_fields = ("review", "user__username", "album__title")
    list_filter = ("score", "created_at")


# Painel de moderação para Comentários nas avaliações
@admin.register(RatingComment)
class RatingCommentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "rating", "created_at")
    search_fields = ("body", "user__username")

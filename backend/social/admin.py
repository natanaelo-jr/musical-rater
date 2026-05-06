from django.contrib import admin

from .models import Follow, Notification


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ("id", "follower", "following", "created_at")
    search_fields = (
        "follower__email",
        "follower__profile__username",
        "following__email",
        "following__profile__username",
    )
    autocomplete_fields = ("follower", "following")
    readonly_fields = ("created_at",)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "recipient", "actor", "kind", "read_at", "created_at")
    search_fields = (
        "recipient__email",
        "recipient__profile__username",
        "actor__email",
        "actor__profile__username",
    )
    list_filter = ("kind", "read_at", "created_at")
    autocomplete_fields = ("recipient", "actor")
    readonly_fields = ("created_at",)

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Profile, User


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    extra = 0
    fields = ("display_name", "username", "avatar_url", "bio")


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = (
        "id",
        "email",
        "profile_username",
        "profile_display_name",
        "is_active",
        "is_staff",
        "is_superuser",
    )
    search_fields = ("email", "profile__username", "profile__display_name")
    list_filter = ("is_staff", "is_superuser", "is_active")
    ordering = ("email",)
    inlines = (ProfileInline,)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )

    @admin.display(description="Username")
    def profile_username(self, obj):
        return obj.profile.username if hasattr(obj, "profile") else ""

    @admin.display(description="Display name")
    def profile_display_name(self, obj):
        return obj.profile.display_name if hasattr(obj, "profile") else ""

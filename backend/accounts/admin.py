from django.contrib import admin
from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    # Tirei o 'display_name' destas duas listas:
    list_display = ("id", "email", "username", "is_staff", "is_superuser")
    search_fields = ("email", "username")
    list_filter = ("is_staff", "is_superuser", "is_active")

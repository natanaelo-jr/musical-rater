from django.conf import settings
from django.db import models


class Follow(models.Model):
    follower = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="following_relationships",
    )
    following = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="follower_relationships",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["follower", "following"],
                name="social_follow_follower_following_unique",
            ),
            models.CheckConstraint(
                condition=~models.Q(follower=models.F("following")),
                name="social_follow_prevent_self_follow",
            ),
        ]

    def __str__(self):
        return f"{self.follower_id} follows {self.following_id}"

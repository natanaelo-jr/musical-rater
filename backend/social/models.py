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


class Notification(models.Model):
    class Kind(models.TextChoices):
        COMMENT_ON_RATING = "comment_on_rating", "Comment on rating"
        REPLY_TO_COMMENT = "reply_to_comment", "Reply to comment"
        NEW_FOLLOWER = "new_follower", "New follower"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_actions",
    )
    kind = models.CharField(max_length=32, choices=Kind.choices)
    rating_id = models.PositiveIntegerField(null=True, blank=True)
    comment_id = models.PositiveIntegerField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["recipient", "-created_at"]),
            models.Index(fields=["recipient", "read_at"]),
        ]

    def __str__(self):
        return f"{self.kind} -> {self.recipient_id}"

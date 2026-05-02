from catalog.models import RatingComment
from social.models import Notification


def notify_rating_comment_created(*, comment: RatingComment, rating):
    if comment.parent_id is None:
        if rating.user_id == comment.user_id:
            return
        Notification.objects.create(
            recipient_id=rating.user_id,
            actor=comment.user,
            kind=Notification.Kind.COMMENT_ON_RATING,
            rating_id=rating.id,
            comment_id=comment.id,
        )
        return

    parent = RatingComment.objects.get(pk=comment.parent_id)
    if parent.user_id == comment.user_id:
        return
    Notification.objects.create(
        recipient_id=parent.user_id,
        actor=comment.user,
        kind=Notification.Kind.REPLY_TO_COMMENT,
        rating_id=rating.id,
        comment_id=comment.id,
    )


def notify_new_follower(*, follower, followed):
    if follower.id == followed.id:
        return
    Notification.objects.create(
        recipient=followed,
        actor=follower,
        kind=Notification.Kind.NEW_FOLLOWER,
    )

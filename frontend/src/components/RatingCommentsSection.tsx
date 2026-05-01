import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../auth/useAuth";
import { apiGet, apiRequest } from "../lib/api";

type CommentAuthor = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
};

export type RatingCommentItem = {
  id: number;
  body: string;
  createdAt: string;
  author: CommentAuthor;
  parentId: number | null;
  replies?: RatingCommentItem[];
};

const miniButtonClass =
  "text-sm font-semibold text-primary underline-offset-2 hover:underline";

export const RatingCommentsSection = ({
  ratingId,
}: {
  ratingId: number;
}) => {
  const auth = useAuth();
  const user = auth.user;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<RatingCommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    void apiGet<{ items: RatingCommentItem[] }>(
      `/catalog/music-ratings/${ratingId}/comments`,
    )
      .then((payload) => setItems(payload.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [ratingId]);

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open, load]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest<{ comment: RatingCommentItem }>(
        `/catalog/music-ratings/${ratingId}/comments`,
        {
          method: "POST",
          body: JSON.stringify({
            body: text,
            parent_id: replyToId,
          }),
        },
      );
      setDraft("");
      setReplyToId(null);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (commentId: number) => {
    setDeletingId(commentId);
    try {
      await apiRequest(`/catalog/music-ratings/comments/${commentId}`, {
        method: "DELETE",
      });
      load();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-4 border-t border-foreground/10 pt-4">
      <button
        className={miniButtonClass}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? "Hide comments" : "Comments"}
      </button>

      {open ? (
        <div className="mt-3 grid gap-4">
          {loading ? (
            <p className="m-0 text-sm text-foreground/62">Loading…</p>
          ) : null}

          {items.map((comment) => (
            <div className="grid gap-2" key={comment.id}>
              <div className="rounded-[14px] bg-white/4 px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {comment.author.displayName ||
                      comment.author.username ||
                      "Listener"}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {user ? (
                      <button
                        className={miniButtonClass}
                        onClick={() => {
                          setReplyToId(comment.id);
                          setDraft("");
                        }}
                        type="button"
                      >
                        Reply
                      </button>
                    ) : null}
                    {user && user.id === comment.author.id ? (
                      <button
                        className={`${miniButtonClass} text-danger`}
                        disabled={deletingId === comment.id}
                        onClick={() => void remove(comment.id)}
                        type="button"
                      >
                        {deletingId === comment.id ? "…" : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="m-0 mt-1 text-sm leading-relaxed text-foreground/84">
                  {comment.body}
                </p>
              </div>
              {(comment.replies ?? []).map((reply) => (
                <div
                  className="ml-4 rounded-[14px] border border-foreground/8 bg-white/3 px-3 py-2"
                  key={reply.id}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {reply.author.displayName ||
                        reply.author.username ||
                        "Listener"}
                    </span>
                    {user && user.id === reply.author.id ? (
                      <button
                        className={`${miniButtonClass} text-danger`}
                        disabled={deletingId === reply.id}
                        onClick={() => void remove(reply.id)}
                        type="button"
                      >
                        {deletingId === reply.id ? "…" : "Delete"}
                      </button>
                    ) : null}
                  </div>
                  <p className="m-0 mt-1 text-sm leading-relaxed text-foreground/84">
                    {reply.body}
                  </p>
                </div>
              ))}
            </div>
          ))}

          {user ? (
            <div className="grid gap-2">
              {replyToId !== null ? (
                <p className="m-0 text-sm text-foreground/66">
                  Replying to a comment.{" "}
                  <button
                    className={miniButtonClass}
                    onClick={() => setReplyToId(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                </p>
              ) : null}
              <textarea
                className="min-h-[80px] w-full resize-y rounded-[14px] border border-foreground/12 bg-white/4 px-3 py-2 text-sm text-foreground/92 placeholder:text-foreground/42 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                maxLength={2000}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write a comment…"
                value={draft}
              />
              <button
                className="inline-flex w-fit items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                disabled={submitting || !draft.trim()}
                onClick={() => void submit()}
                type="button"
              >
                {submitting ? "Posting…" : "Post"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

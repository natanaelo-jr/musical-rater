import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ApiError, apiGet, apiRequest } from "../lib/api";

type Actor = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  bio: string;
};

type NotificationItem = {
  id: number;
  kind: string;
  read: boolean;
  createdAt: string;
  actor: Actor;
  ratingId: number | null;
  commentId: number | null;
};

const readError = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Unexpected error. Please try again.";
};

const describeNotification = (item: NotificationItem) => {
  const name =
    item.actor.displayName ||
    (item.actor.username ? `@${item.actor.username}` : "Someone");
  switch (item.kind) {
    case "new_follower":
      return `${name} started following you.`;
    case "comment_on_rating":
      return `${name} commented on your review.`;
    case "reply_to_comment":
      return `${name} replied to your comment.`;
    default:
      return "New activity.";
  }
};

const cardClass =
  "rounded-[28px] border border-foreground/12 bg-panel p-8 shadow-panel backdrop-blur-[20px]";
const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full bg-primary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export const NotificationsPage = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  const load = () => {
    setStatus("loading");
    void apiGet<{ items: NotificationItem[] }>("/social/notifications")
      .then((payload) => {
        setItems(payload.items);
        setStatus("ready");
        setMessage("");
      })
      .catch((error: unknown) => {
        setItems([]);
        setStatus("error");
        setMessage(readError(error));
      });
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id: number) => {
    try {
      await apiRequest(`/social/notifications/${id}/read`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setItems((current) =>
        current.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch (error: unknown) {
      setMessage(readError(error));
    }
  };

  const markAllRead = async () => {
    try {
      await apiRequest("/social/notifications/read-all", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setItems((current) => current.map((n) => ({ ...n, read: true })));
    } catch (error: unknown) {
      setMessage(readError(error));
    }
  };

  return (
    <section className="mx-auto grid max-w-[720px] gap-6">
      <article className={cardClass}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
              Activity
            </p>
            <h1 className="m-0 text-[clamp(1.8rem,3vw,2.6rem)] leading-tight">
              Notifications
            </h1>
          </div>
          {items.some((n) => !n.read) ? (
            <button
              className={ghostButtonClass}
              onClick={() => void markAllRead()}
              type="button"
            >
              Mark all read
            </button>
          ) : null}
        </div>
        {message ? (
          <p className="mt-4 text-danger" role="alert">
            {message}
          </p>
        ) : null}
        {status === "loading" ? (
          <p className="mt-6 text-foreground/72">Loading…</p>
        ) : null}
        {status === "ready" && items.length === 0 ? (
          <p className="mt-6 text-foreground/72">
            No notifications yet. Follow people or get comments on your reviews
            to see activity here.
          </p>
        ) : null}
        <ul className="mt-6 grid list-none gap-3 p-0">
          {items.map((item) => (
            <li key={item.id}>
              <article
                className={`rounded-[20px] border px-4 py-4 ${
                  item.read
                    ? "border-foreground/10 bg-white/3"
                    : "border-secondary/28 bg-secondary/8"
                }`}
              >
                <p className="m-0 leading-relaxed text-foreground/88">
                  {describeNotification(item)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Link
                    className="text-sm font-semibold text-primary"
                    to={`/app/people/${item.actor.id}`}
                  >
                    View profile
                  </Link>
                  {item.ratingId && item.kind !== "new_follower" ? (
                    <Link
                      className="text-sm font-semibold text-primary"
                      to="/app/profile"
                    >
                      Your reviews
                    </Link>
                  ) : null}
                  {!item.read ? (
                    <button
                      className="text-sm font-semibold text-primary underline"
                      onClick={() => void markRead(item.id)}
                      type="button"
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
};

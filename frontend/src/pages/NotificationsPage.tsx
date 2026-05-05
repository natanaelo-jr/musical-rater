import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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

const describeNotification = (
  item: NotificationItem,
  t: (key: string, options?: Record<string, string>) => string,
) => {
  const name =
    item.actor.displayName ||
    (item.actor.username ? `@${item.actor.username}` : t("someone"));
  switch (item.kind) {
    case "new_follower":
      return t("notification_new_follower", { name });
    case "comment_on_rating":
      return t("notification_comment_on_rating", { name });
    case "reply_to_comment":
      return t("notification_reply_to_comment", { name });
    default:
      return t("notification_new_activity");
  }
};

const cardClass =
  "rounded-[28px] border border-foreground/12 bg-panel p-8 shadow-panel backdrop-blur-[20px]";
const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full bg-primary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export const NotificationsPage = () => {
  const { t } = useTranslation();
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
              {t("activity")}
            </p>
            <h1 className="m-0 text-[clamp(1.8rem,3vw,2.6rem)] leading-tight">
              {t("notifications")}
            </h1>
          </div>
          {items.some((n) => !n.read) ? (
            <button
              className={ghostButtonClass}
              onClick={() => void markAllRead()}
              type="button"
            >
              {t("mark_all_read")}
            </button>
          ) : null}
        </div>
        {message ? (
          <p className="mt-4 text-danger" role="alert">
            {message}
          </p>
        ) : null}
        {status === "loading" ? (
          <p className="mt-6 text-foreground/72">{t("loading")}</p>
        ) : null}
        {status === "ready" && items.length === 0 ? (
          <p className="mt-6 text-foreground/72">{t("no_notifications")}</p>
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
                  {describeNotification(item, t)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Link
                    className="text-sm font-semibold text-primary"
                    to={`/app/people/${item.actor.id}`}
                  >
                    {t("view_profile")}
                  </Link>
                  {item.ratingId && item.kind !== "new_follower" ? (
                    <Link
                      className="text-sm font-semibold text-primary"
                      to="/app/profile"
                    >
                      {t("your_reviews")}
                    </Link>
                  ) : null}
                  {!item.read ? (
                    <button
                      className="text-sm font-semibold text-primary underline"
                      onClick={() => void markRead(item.id)}
                      type="button"
                    >
                      {t("mark_read")}
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

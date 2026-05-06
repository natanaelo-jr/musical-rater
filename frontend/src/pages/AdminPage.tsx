import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../auth/useAuth";
import { apiGet, apiRequest } from "../lib/api";

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  username: string;
  isActive: boolean;
  isStaff: boolean;
  isSuperuser: boolean;
  createdAt: string;
};

type ContentAuthor = {
  id: string;
  email: string;
  displayName: string;
  username: string;
};

type ModerationRating = {
  id: number;
  kind: "track" | "album";
  score: number;
  review: string;
  createdAt: string;
  author: ContentAuthor;
  target: {
    title: string;
    artistName: string;
  };
};

type ModerationComment = {
  id: number;
  body: string;
  createdAt: string;
  author: ContentAuthor;
  rating: {
    id: number;
    score: number;
    review: string;
    targetTitle: string;
    targetArtist: string;
  };
};

const panelClass =
  "rounded-[28px] border border-foreground/12 bg-panel p-6 shadow-panel backdrop-blur-[20px]";
const tableCellClass = "border-t border-foreground/10 px-3 py-3 align-top";
const actionButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";
const dangerButtonClass =
  "inline-flex min-h-10 items-center justify-center rounded-full border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-bold text-danger transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const authorLabel = (author: ContentAuthor) =>
  author.displayName || author.username || author.email;

export const AdminPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [ratings, setRatings] = useState<ModerationRating[]>([]);
  const [comments, setComments] = useState<ModerationComment[]>([]);
  const [query, setQuery] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const canManageUsers = Boolean(user?.isSuperuser);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    return params.toString();
  }, [query]);

  const loadUsers = useCallback(async () => {
    const suffix = queryString ? `?${queryString}` : "";
    const payload = await apiGet<{ items: AdminUser[] }>(
      `/moderation/users${suffix}`,
    );
    setUsers(payload.items);
  }, [queryString]);

  const loadContent = useCallback(async () => {
    const [ratingsPayload, commentsPayload] = await Promise.all([
      apiGet<{ items: ModerationRating[] }>("/moderation/ratings"),
      apiGet<{ items: ModerationComment[] }>("/moderation/comments"),
    ]);
    setRatings(ratingsPayload.items);
    setComments(commentsPayload.items);
  }, []);

  useEffect(() => {
    void loadUsers().catch(() => setUsers([]));
  }, [loadUsers]);

  useEffect(() => {
    void loadContent().catch(() => {
      setRatings([]);
      setComments([]);
    });
  }, [loadContent]);

  const updateUser = async (
    targetUser: AdminUser,
    updates: Partial<Pick<AdminUser, "isActive" | "isStaff" | "isSuperuser">>,
  ) => {
    const key = `user-${targetUser.id}`;
    setBusyKey(key);
    try {
      const payload = await apiRequest<{ user: AdminUser }>(
        `/moderation/users/${targetUser.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            is_active: updates.isActive,
            is_staff: updates.isStaff,
            is_superuser: updates.isSuperuser,
          }),
        },
      );
      setUsers((items) =>
        items.map((item) => (item.id === targetUser.id ? payload.user : item)),
      );
    } finally {
      setBusyKey("");
    }
  };

  const deleteRating = async (rating: ModerationRating) => {
    const key = `rating-${rating.kind}-${rating.id}`;
    setBusyKey(key);
    try {
      await apiRequest(`/moderation/ratings/${rating.kind}/${rating.id}`, {
        method: "DELETE",
      });
      setRatings((items) =>
        items.filter(
          (item) => item.id !== rating.id || item.kind !== rating.kind,
        ),
      );
    } finally {
      setBusyKey("");
    }
  };

  const deleteComment = async (comment: ModerationComment) => {
    const key = `comment-${comment.id}`;
    setBusyKey(key);
    try {
      await apiRequest(`/moderation/comments/${comment.id}`, {
        method: "DELETE",
      });
      setComments((items) => items.filter((item) => item.id !== comment.id));
    } finally {
      setBusyKey("");
    }
  };

  return (
    <section className="mx-auto grid max-w-[1180px] gap-6">
      <header className={panelClass}>
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
          Administração
        </p>
        <h1 className="m-0 text-[clamp(2rem,4vw,4rem)] leading-[0.98]">
          Moderação do Musical Rater
        </h1>
      </header>

      <section className={panelClass}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
              Usuários
            </p>
            <h2 className="m-0 text-2xl leading-tight">Contas e permissões</h2>
          </div>
          <label className="grid gap-2 text-sm text-foreground/78">
            Buscar
            <input
              className="min-h-11 rounded-[14px] border border-foreground/12 bg-white/5 px-4 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="email ou username"
              value={query}
            />
          </label>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="text-foreground/68">
              <tr>
                <th className="px-3 py-2 font-semibold">Usuário</th>
                <th className="px-3 py-2 font-semibold">Criado em</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Permissões</th>
                <th className="px-3 py-2 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => {
                const disabled =
                  !canManageUsers || busyKey === `user-${item.id}`;
                return (
                  <tr key={item.id}>
                    <td className={tableCellClass}>
                      <strong>{item.displayName || item.email}</strong>
                      <div className="text-foreground/68">
                        {item.username ? `@${item.username} · ` : ""}
                        {item.email}
                      </div>
                    </td>
                    <td className={tableCellClass}>
                      {formatDate(item.createdAt)}
                    </td>
                    <td className={tableCellClass}>
                      {item.isActive ? "Ativa" : "Desativada"}
                    </td>
                    <td className={tableCellClass}>
                      {[
                        item.isStaff ? "staff" : "",
                        item.isSuperuser ? "superuser" : "",
                      ]
                        .filter(Boolean)
                        .join(", ") || "usuário"}
                    </td>
                    <td className={`${tableCellClass} space-x-2`}>
                      <button
                        className={actionButtonClass}
                        disabled={disabled}
                        onClick={() =>
                          void updateUser(item, { isStaff: !item.isStaff })
                        }
                        type="button"
                      >
                        {item.isStaff ? "Remover staff" : "Tornar staff"}
                      </button>
                      <button
                        className={dangerButtonClass}
                        disabled={disabled}
                        onClick={() =>
                          void updateUser(item, { isActive: !item.isActive })
                        }
                        type="button"
                      >
                        {item.isActive ? "Desativar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!canManageUsers ? (
          <p className="mt-4 text-sm text-foreground/70">
            Apenas superusuários podem alterar permissões de contas.
          </p>
        ) : null}
      </section>

      <section className={panelClass}>
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
          Avaliações
        </p>
        <div className="grid gap-3">
          {ratings.map((rating) => (
            <article
              className="grid gap-3 rounded-[18px] bg-white/4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
              key={`${rating.kind}-${rating.id}`}
            >
              <div className="grid gap-1">
                <strong>
                  {rating.target.title} · {rating.target.artistName}
                </strong>
                <span className="text-sm text-foreground/68">
                  {authorLabel(rating.author)} · {rating.score}/5 ·{" "}
                  {rating.kind === "album" ? "álbum" : "música"}
                </span>
                {rating.review ? (
                  <p className="m-0 leading-[1.6] text-foreground/82">
                    {rating.review}
                  </p>
                ) : null}
              </div>
              <button
                className={dangerButtonClass}
                disabled={busyKey === `rating-${rating.kind}-${rating.id}`}
                onClick={() => void deleteRating(rating)}
                type="button"
              >
                Remover
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className={panelClass}>
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
          Comentários
        </p>
        <div className="grid gap-3">
          {comments.map((comment) => (
            <article
              className="grid gap-3 rounded-[18px] bg-white/4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
              key={comment.id}
            >
              <div className="grid gap-1">
                <strong>{authorLabel(comment.author)}</strong>
                <span className="text-sm text-foreground/68">
                  Em {comment.rating.targetTitle} ·{" "}
                  {comment.rating.targetArtist}
                </span>
                <p className="m-0 leading-[1.6] text-foreground/82">
                  {comment.body}
                </p>
              </div>
              <button
                className={dangerButtonClass}
                disabled={busyKey === `comment-${comment.id}`}
                onClick={() => void deleteComment(comment)}
                type="button"
              >
                Remover
              </button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
};

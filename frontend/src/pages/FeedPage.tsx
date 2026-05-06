import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiGet } from "../lib/api";

type FeedItem = {
  reviewId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
  song: {
    id: string;
    name: string;
  };
  artist: {
    id: string;
    name: string;
  };
  rating: number;
  review: string;
  createdAt: string;
};

type FeedResponse = {
  items: FeedItem[];
  page: number;
  hasNextPage: boolean;
};

const panelClass =
  "rounded-[28px] border border-foreground/12 bg-panel p-8 shadow-panel backdrop-blur-[20px]";
const buttonClass =
  "inline-flex items-center justify-center rounded-full bg-primary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const userLabel = (item: FeedItem) =>
  item.user.displayName || item.user.username || "Listener";

export const FeedPage = () => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPage = async (nextPage: number) => {
    setLoading(true);
    try {
      const payload = await apiGet<FeedResponse>(`/feed?page=${nextPage}`);
      setItems((current) =>
        nextPage === 1 ? payload.items : [...current, ...payload.items],
      );
      setPage(payload.page);
      setHasNextPage(payload.hasNextPage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPage(1);
  }, []);

  return (
    <section className="mx-auto grid max-w-[880px] gap-6">
      <header className={panelClass}>
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
          Feed
        </p>
        <h1 className="m-0 text-[clamp(2rem,4vw,4rem)] leading-[0.98]">
          Reviews de quem você segue
        </h1>
      </header>

      <div className="grid gap-4">
        {items.map((item) => (
          <article
            className="grid gap-4 rounded-[24px] border border-foreground/12 bg-panel p-6 shadow-panel backdrop-blur-[20px]"
            key={item.reviewId}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1">
                <Link
                  className="w-fit font-bold text-foreground no-underline hover:text-primary"
                  to={`/app/people/${item.user.id}`}
                >
                  {userLabel(item)}
                </Link>
                <Link
                  className="w-fit text-xl font-bold text-foreground no-underline hover:text-primary"
                  to={`/app/songs/${item.song.id}`}
                >
                  {item.song.name}
                </Link>
                <span className="text-foreground/72">{item.artist.name}</span>
              </div>
              <div className="grid justify-items-end gap-2">
                <span className="rounded-full bg-secondary/16 px-3 py-2 text-sm font-bold">
                  {item.rating}/5
                </span>
                <span className="text-sm text-foreground/62">
                  {formatDate(item.createdAt)}
                </span>
              </div>
            </div>

            {item.review ? (
              <p className="m-0 leading-[1.7] text-foreground/84">
                {item.review}
              </p>
            ) : null}
          </article>
        ))}

        {!loading && items.length === 0 ? (
          <div className={`${panelClass} text-center text-foreground/78`}>
            Siga outros usuários para ver reviews aqui.
          </div>
        ) : null}

        {hasNextPage ? (
          <button
            className={`${buttonClass} w-fit`}
            disabled={loading}
            onClick={() => void loadPage(page + 1)}
            type="button"
          >
            {loading ? "Carregando..." : "Carregar mais"}
          </button>
        ) : null}
      </div>
    </section>
  );
};

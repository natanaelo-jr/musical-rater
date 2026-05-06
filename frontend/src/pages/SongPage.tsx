import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { apiGet } from "../lib/api";

type SongReview = {
  reviewId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
  rating: number;
  review: string;
  createdAt: string;
};

type SongPayload = {
  song: {
    id: string;
    name: string;
    artist: {
      id: string;
      name: string;
    };
    album: {
      id: string;
      name: string;
    } | null;
    artworkUrl: string;
    releaseDate: string;
  };
  stats: {
    averageRating: number | null;
    totalReviews: number;
  };
  reviews: SongReview[];
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

const reviewUserLabel = (review: SongReview) =>
  review.user.displayName || review.user.username || "Listener";

export const SongPage = () => {
  const { songId } = useParams();
  const [song, setSong] = useState<SongPayload["song"] | null>(null);
  const [stats, setStats] = useState<SongPayload["stats"] | null>(null);
  const [reviews, setReviews] = useState<SongReview[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(
    async (nextPage: number) => {
      if (!songId) {
        return;
      }

      setLoading(true);
      try {
        const payload = await apiGet<SongPayload>(
          `/songs/${songId}?page=${nextPage}`,
        );
        setSong(payload.song);
        setStats(payload.stats);
        setReviews((current) =>
          nextPage === 1 ? payload.reviews : [...current, ...payload.reviews],
        );
        setPage(payload.page);
        setHasNextPage(payload.hasNextPage);
      } finally {
        setLoading(false);
      }
    },
    [songId],
  );

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  if (!song && loading) {
    return (
      <section className={`mx-auto max-w-[900px] ${panelClass}`}>
        Carregando música...
      </section>
    );
  }

  if (!song || !stats) {
    return (
      <section className={`mx-auto max-w-[900px] ${panelClass}`}>
        Música não encontrada.
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-[980px] gap-6">
      <header className={`${panelClass} grid gap-6 md:grid-cols-[180px_1fr]`}>
        <div className="grid aspect-square place-items-center overflow-hidden rounded-[24px] border border-foreground/12 bg-linear-to-br from-primary/22 via-white/5 to-secondary/24">
          {song.artworkUrl ? (
            <img
              alt={`${song.name} cover`}
              className="h-full w-full object-cover"
              src={song.artworkUrl}
            />
          ) : (
            <span className="text-4xl font-bold">♪</span>
          )}
        </div>
        <div className="grid content-center gap-3">
          <p className="m-0 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
            Música
          </p>
          <h1 className="m-0 text-[clamp(2.2rem,5vw,4.8rem)] leading-[0.98]">
            {song.name}
          </h1>
          <p className="m-0 text-lg text-foreground/82">{song.artist.name}</p>
          {song.album ? (
            <p className="m-0 text-foreground/68">{song.album.name}</p>
          ) : null}
        </div>
      </header>

      <section className={`${panelClass} grid gap-4 sm:grid-cols-2`}>
        <div className="rounded-[18px] bg-white/4 p-5">
          <p className="mb-2 text-sm text-primary">Nota média</p>
          <strong className="text-3xl">
            {stats.averageRating ?? "Sem nota"}
          </strong>
        </div>
        <div className="rounded-[18px] bg-white/4 p-5">
          <p className="mb-2 text-sm text-primary">Total de reviews</p>
          <strong className="text-3xl">{stats.totalReviews}</strong>
        </div>
      </section>

      <section className={panelClass}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
              Reviews
            </p>
            <h2 className="m-0 text-2xl leading-tight">
              Opiniões da comunidade
            </h2>
          </div>
          <Link className="font-semibold text-primary" to="/app/search">
            Buscar mais músicas
          </Link>
        </div>

        <div className="grid gap-3">
          {reviews.map((review) => (
            <article
              className="rounded-[18px] bg-white/4 p-5"
              key={review.reviewId}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link
                  className="font-bold text-foreground no-underline hover:text-primary"
                  to={`/app/people/${review.user.id}`}
                >
                  {reviewUserLabel(review)}
                </Link>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-secondary/16 px-3 py-2 font-bold">
                    {review.rating}/5
                  </span>
                  <span className="text-foreground/62">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
              </div>
              {review.review ? (
                <p className="m-0 mt-3 leading-[1.7] text-foreground/84">
                  {review.review}
                </p>
              ) : null}
            </article>
          ))}
        </div>

        {!loading && reviews.length === 0 ? (
          <p className="m-0 text-foreground/78">
            Essa música ainda não recebeu reviews.
          </p>
        ) : null}

        {hasNextPage ? (
          <button
            className={`${buttonClass} mt-5`}
            disabled={loading}
            onClick={() => void loadPage(page + 1)}
            type="button"
          >
            {loading ? "Carregando..." : "Carregar mais"}
          </button>
        ) : null}
      </section>
    </section>
  );
};

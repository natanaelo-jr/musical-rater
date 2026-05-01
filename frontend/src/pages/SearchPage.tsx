import { useEffect, useRef, useState } from "react";

import { ApiError, apiGet, apiRequest } from "../lib/api";

type SearchType = "all" | "track" | "album";

type CatalogItem = {
  id?: number;
  type: "track" | "album";
  sourceProvider: string;
  externalId: string;
  title: string;
  artistName: string;
  albumTitle?: string;
  artworkUrl?: string;
  releaseDate?: string;
  durationSeconds?: number;
  imported: boolean;
  myRating?: number;
  myReview?: string;
  metadata?: Record<string, unknown>;
};

type Rating = {
  id: number;
  musicId: number;
  score: number;
  review: string;
};

type SearchResponse = {
  items: CatalogItem[];
  page: number;
  hasNextPage: boolean;
};

const filters: Array<{ label: string; value: SearchType }> = [
  { label: "All", value: "all" },
  { label: "Tracks", value: "track" },
  { label: "Albums", value: "album" },
];

const initialCopy =
  "Search by title, artist, album, or show, then save what belongs in your catalog.";
const shortQueryCopy = "Use at least 2 characters to search the catalog.";
const cardClass =
  "rounded-[28px] border border-foreground/12 bg-surface p-8 shadow-panel backdrop-blur-[20px]";
const chipClass =
  "rounded-full border px-4 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full bg-primary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

const readError = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Unexpected error. Please try again.";
};

const formatDate = (value?: string) => {
  if (!value) {
    return "Unknown release";
  }

  if (/^\d{4}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: value.length > 7 ? "numeric" : undefined,
  }).format(parsed);
};

const itemKey = (item: CatalogItem) =>
  `${item.sourceProvider}:${item.externalId}`;

export const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("all");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [message, setMessage] = useState(initialCopy);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [draftScore, setDraftScore] = useState<number | null>(null);
  const [draftReview, setDraftReview] = useState("");
  const requestIdRef = useRef(0);

  const trimmedQuery = query.trim();

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    if (trimmedQuery.length === 0) {
      setResults([]);
      setSelectedItem(null);
      setHasNextPage(false);
      setPage(1);
      setStatus("idle");
      setMessage(initialCopy);
      return;
    }

    if (trimmedQuery.length < 2) {
      setResults([]);
      setSelectedItem(null);
      setHasNextPage(false);
      setPage(1);
      setStatus("error");
      setMessage(shortQueryCopy);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setStatus("loading");
      setMessage(`Searching for "${trimmedQuery}"...`);
      setResults([]);
      setSelectedItem(null);
      setHasNextPage(false);
      setPage(1);

      void apiRequest<SearchResponse>(
        `/catalog/search?q=${encodeURIComponent(trimmedQuery)}&type=${type}&page=1`,
        {
          method: "GET",
          signal: controller.signal,
        },
      )
        .then((payload) => {
          if (requestId !== requestIdRef.current || controller.signal.aborted) {
            return;
          }

          setResults(payload.items);
          setSelectedItem((current) => {
            if (!current) {
              return payload.items[0] ?? null;
            }

            return (
              payload.items.find(
                (item) => itemKey(item) === itemKey(current),
              ) ??
              payload.items[0] ??
              null
            );
          });
          setPage(payload.page);
          setHasNextPage(payload.hasNextPage);
          setStatus("ready");
          setMessage(
            payload.items.length
              ? `Showing ${payload.items.length} result${payload.items.length === 1 ? "" : "s"} for ${type === "all" ? "all matches" : type === "track" ? "tracks" : "albums"}.${payload.hasNextPage ? " Load more to keep browsing." : ""}`
              : `No matches for "${trimmedQuery}". Try a shorter title, another artist, or switch filters.`,
          );
        })
        .catch((error: unknown) => {
          if (requestId !== requestIdRef.current || controller.signal.aborted) {
            return;
          }

          setResults([]);
          setSelectedItem(null);
          setHasNextPage(false);
          setPage(1);
          setStatus("error");
          setMessage(readError(error));
        });
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [trimmedQuery, type]);

  useEffect(() => {
    if (
      !selectedItem?.id ||
      selectedItem.type !== "track" ||
      !selectedItem.imported
    ) {
      return;
    }

    void apiGet<{ rating: Rating | null }>(
      `/catalog/ratings/${selectedItem.id}`,
    )
      .then((payload) => {
        const nextRating = payload.rating;
        setResults((current) =>
          current.map((entry) =>
            entry.id === selectedItem.id
              ? {
                  ...entry,
                  myRating: nextRating?.score,
                  myReview: nextRating?.review ?? "",
                }
              : entry,
          ),
        );
        setSelectedItem((current) =>
          current && current.id === selectedItem.id
            ? {
                ...current,
                myRating: nextRating?.score,
                myReview: nextRating?.review ?? "",
              }
            : current,
        );
        setDraftScore(nextRating?.score ?? null);
        setDraftReview(nextRating?.review ?? "");
      })
      .catch((error: unknown) => {
        setMessage(readError(error));
      });
  }, [selectedItem?.id, selectedItem?.imported, selectedItem?.type]);

  const importItem = async (item: CatalogItem) => {
    setImportingId(item.externalId);

    try {
      const payload = await apiRequest<{ item: CatalogItem }>(
        "/catalog/import",
        {
          method: "POST",
          body: JSON.stringify({
            source_provider: item.sourceProvider,
            external_id: item.externalId,
            type: item.type,
          }),
        },
      );

      const importedItem = payload.item;
      setResults((current) =>
        current.map((entry) =>
          itemKey(entry) === itemKey(importedItem)
            ? { ...entry, ...importedItem, imported: true }
            : entry,
        ),
      );
      setSelectedItem((current) => {
        if (!current) {
          return importedItem;
        }

        if (itemKey(current) === itemKey(importedItem)) {
          return { ...current, ...importedItem, imported: true };
        }

        return current;
      });
      setMessage(`"${importedItem.title}" is now saved in your catalog.`);
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setImportingId(null);
    }
  };

  const loadMore = async () => {
    if (!hasNextPage || isLoadingMore || trimmedQuery.length < 2) {
      return;
    }

    const nextPage = page + 1;
    const requestId = ++requestIdRef.current;
    setIsLoadingMore(true);
    setMessage(`Loading more results for "${trimmedQuery}"...`);

    try {
      const payload = await apiRequest<SearchResponse>(
        `/catalog/search?q=${encodeURIComponent(trimmedQuery)}&type=${type}&page=${nextPage}`,
        {
          method: "GET",
        },
      );

      if (requestId !== requestIdRef.current) {
        return;
      }

      setResults((current) => {
        const merged = [...current];
        const seen = new Set(current.map(itemKey));

        for (const item of payload.items) {
          const key = itemKey(item);
          if (!seen.has(key)) {
            merged.push(item);
            seen.add(key);
          }
        }

        return merged;
      });
      setPage(payload.page);
      setHasNextPage(payload.hasNextPage);
      setStatus("ready");
      setMessage(
        payload.items.length
          ? `Loaded page ${payload.page}. ${payload.hasNextPage ? " Load more to keep browsing." : " You have reached the end of the current results."}`
          : "No additional results were returned.",
      );
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setStatus("error");
      setMessage(readError(error));
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    setDraftScore(selectedItem?.myRating ?? null);
    setDraftReview(selectedItem?.myReview ?? "");
  }, [
    selectedItem?.externalId,
    selectedItem?.myRating,
    selectedItem?.myReview,
  ]);

  const updateItemRating = (itemId: number, score?: number, review = "") => {
    setResults((current) =>
      current.map((entry) =>
        entry.id === itemId
          ? { ...entry, myRating: score, myReview: review }
          : entry,
      ),
    );
    setSelectedItem((current) =>
      current && current.id === itemId
        ? { ...current, myRating: score, myReview: review }
        : current,
    );
  };

  const saveRating = async (item: CatalogItem) => {
    if (!item.id) {
      return;
    }

    if (!draftScore) {
      setMessage("Choose a score before saving your review.");
      return;
    }

    setSavingRating(true);

    try {
      const payload = await apiRequest<{ rating: Rating }>(
        `/catalog/ratings/${item.id}`,
        {
          method: "POST",
          body: JSON.stringify({
            score: draftScore,
            review: draftReview,
          }),
        },
      );
      updateItemRating(item.id, payload.rating.score, payload.rating.review);
      setDraftScore(payload.rating.score);
      setDraftReview(payload.rating.review);
      setMessage(`Saved your review for "${item.title}".`);
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setSavingRating(false);
    }
  };

  const clearRating = async (item: CatalogItem) => {
    if (!item.id) {
      return;
    }

    setSavingRating(true);

    try {
      await apiRequest<{ rating: null }>(`/catalog/ratings/${item.id}`, {
        method: "DELETE",
      });
      updateItemRating(item.id);
      setDraftScore(null);
      setDraftReview("");
      setMessage(`Cleared your rating for "${item.title}".`);
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setSavingRating(false);
    }
  };

  const emptyStateCopy =
    status === "error"
      ? message
      : trimmedQuery.length < 2
        ? shortQueryCopy
        : "No results loaded yet. Search for a title, artist, or album to begin.";

  return (
    <section className="mx-auto grid max-w-[1240px] gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
      <article className={`${cardClass} grid content-start gap-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
              Catalog search
            </p>
            <h1 className="m-0 text-[clamp(2rem,4vw,4.5rem)] leading-[0.98]">
              Find the songs and albums you want to rate next.
            </h1>
            <p className="mt-4 leading-[1.6] text-foreground/82">
              {initialCopy}
            </p>
          </div>
        </div>

        <label className="grid gap-2.5" htmlFor="catalog-search">
          <span className="text-sm text-primary">Search query</span>
          <input
            autoComplete="off"
            className="w-full rounded-[18px] border border-foreground/14 bg-white/5 px-[18px] py-4 text-foreground/92 placeholder:text-foreground/42 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            id="catalog-search"
            name="catalog_search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by song, album, artist, or show title..."
            spellCheck={false}
            type="search"
            value={query}
          />
        </label>

        <div
          aria-live="polite"
          className="-mt-2 leading-[1.6] text-foreground/82"
        >
          {trimmedQuery.length < 2 && trimmedQuery.length > 0
            ? shortQueryCopy
            : "Try searches like Hadestown, Sondheim, or Original Broadway Cast."}
        </div>

        <div
          aria-label="Search filters"
          className="flex flex-wrap gap-3"
          role="group"
        >
          {filters.map((filter) => (
            <button
              aria-pressed={type === filter.value}
              className={`${chipClass} ${
                type === filter.value
                  ? "border-secondary bg-linear-to-br from-primary/20 to-secondary/28 text-foreground"
                  : "border-foreground/14 bg-white/4 text-foreground/84"
              }`}
              key={filter.value}
              onClick={() => setType(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <p
          aria-live={status === "error" ? "assertive" : "polite"}
          className={
            status === "error"
              ? "text-danger"
              : "leading-[1.6] text-foreground/82"
          }
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>

        <div
          className="grid gap-[14px]"
          aria-busy={status === "loading" || isLoadingMore}
        >
          {status === "loading" ? (
            <div className="rounded-[22px] border border-dashed border-foreground/12 bg-white/3 p-7 text-center text-foreground/72">
              Searching the catalog...
            </div>
          ) : null}

          {status !== "loading" &&
            results.map((item) => {
              const isSelected = selectedItem
                ? itemKey(selectedItem) === itemKey(item)
                : false;

              return (
                <button
                  className={`grid w-full items-center gap-4 rounded-[22px] border px-4 py-4 text-left text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface md:grid-cols-[72px_minmax(0,1fr)_auto] ${
                    isSelected
                      ? "border-secondary bg-secondary/8"
                      : "border-foreground/12 bg-white/4"
                  }`}
                  key={itemKey(item)}
                  onClick={() => setSelectedItem(item)}
                  type="button"
                >
                  <div className="h-[72px] w-[72px] overflow-hidden rounded-[18px]">
                    {item.artworkUrl ? (
                      <img
                        alt={`${item.title} cover`}
                        className="h-full w-full rounded-[18px] bg-white/4 object-cover"
                        height="72"
                        loading="lazy"
                        src={item.artworkUrl}
                        width="72"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center rounded-[18px] bg-linear-to-br from-primary/28 to-secondary/28 text-[1.4rem] font-bold">
                        {item.type === "album" ? "LP" : "♪"}
                      </div>
                    )}
                  </div>
                  <div className="grid min-w-0 gap-1.5">
                    <div className="flex flex-wrap gap-2.5 text-[0.8rem] uppercase tracking-[0.08em] text-foreground/64">
                      <span className="text-primary">{item.type}</span>
                      <span>{item.sourceProvider}</span>
                    </div>
                    <strong className="overflow-hidden text-ellipsis">
                      {item.title}
                    </strong>
                    <span className="overflow-hidden text-ellipsis">
                      {item.artistName}
                    </span>
                    <span className="overflow-hidden text-ellipsis">
                      {formatDate(item.releaseDate)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-start justify-end gap-2 md:justify-self-end">
                    <span
                      className={`self-start rounded-full px-3 py-2 text-[0.78rem] ${
                        item.imported
                          ? "bg-success-bg text-success"
                          : "bg-white/8 text-foreground/78"
                      }`}
                    >
                      {item.imported ? "Saved" : "Available"}
                    </span>
                    {item.myRating ? (
                      <span className="rounded-full bg-secondary/16 px-3 py-2 text-[0.78rem] font-semibold text-foreground">
                        Rated {item.myRating}/5
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}

          {status === "ready" && results.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-foreground/12 bg-white/3 p-7 text-center text-foreground/72">
              {emptyStateCopy}
            </div>
          ) : null}
        </div>

        {hasNextPage && results.length > 0 ? (
          <div className="flex justify-start">
            <button
              className={ghostButtonClass}
              onClick={() => void loadMore()}
              type="button"
            >
              {isLoadingMore ? "Loading More..." : "Load More"}
            </button>
          </div>
        ) : null}
      </article>

      <aside className={`${cardClass} grid content-start gap-6`}>
        <p className="mb-0 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
          Selection
        </p>
        {selectedItem ? (
          <>
            <h2 className="m-0 text-[clamp(1.6rem,2.4vw,2.4rem)] leading-[1.05]">
              {selectedItem.title}
            </h2>
            <p className="-mt-4 text-[1.05rem] leading-[1.7] text-foreground/82">
              {selectedItem.artistName}
            </p>
            <dl className="grid gap-4">
              <div className="rounded-[18px] bg-white/4 p-4">
                <dt className="mb-2 text-sm text-primary">Type</dt>
                <dd className="m-0 leading-[1.6] text-foreground/82">
                  {selectedItem.type}
                </dd>
              </div>
              <div className="rounded-[18px] bg-white/4 p-4">
                <dt className="mb-2 text-sm text-primary">Release</dt>
                <dd className="m-0 leading-[1.6] text-foreground/82">
                  {formatDate(selectedItem.releaseDate)}
                </dd>
              </div>
              <div className="rounded-[18px] bg-white/4 p-4">
                <dt className="mb-2 text-sm text-primary">Provider</dt>
                <dd className="m-0 leading-[1.6] text-foreground/82">
                  {selectedItem.sourceProvider}
                </dd>
              </div>
              <div className="rounded-[18px] bg-white/4 p-4">
                <dt className="mb-2 text-sm text-primary">Catalog status</dt>
                <dd className="m-0 leading-[1.6] text-foreground/82">
                  {selectedItem.imported
                    ? "Saved to your catalog."
                    : "Not saved yet."}
                </dd>
              </div>
              {selectedItem.albumTitle ? (
                <div className="rounded-[18px] bg-white/4 p-4">
                  <dt className="mb-2 text-sm text-primary">Album</dt>
                  <dd className="m-0 leading-[1.6] text-foreground/82">
                    {selectedItem.albumTitle}
                  </dd>
                </div>
              ) : null}
            </dl>
            <button
              className={primaryButtonClass}
              disabled={
                selectedItem.imported || importingId === selectedItem.externalId
              }
              onClick={() => void importItem(selectedItem)}
              type="button"
            >
              {selectedItem.imported
                ? "Saved to Your Catalog"
                : importingId === selectedItem.externalId
                  ? "Saving..."
                  : "Save to My Catalog"}
            </button>
            {selectedItem.type === "track" && selectedItem.imported ? (
              <div className="grid gap-3 rounded-[22px] bg-white/4 p-5">
                <p className="m-0 leading-[1.6] text-foreground/82">
                  {selectedItem.myRating
                    ? `Your rating: ${selectedItem.myRating}/5`
                    : "Add a rating and review."}
                </p>
                <div
                  className="flex flex-wrap gap-3"
                  aria-label="Rate this track"
                >
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      aria-pressed={draftScore === score}
                      className={`min-h-[44px] min-w-[44px] rounded-full border px-4 py-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                        draftScore === score
                          ? "border-secondary bg-linear-to-br from-primary/20 to-secondary/28 text-foreground"
                          : "border-foreground/12 bg-foreground/5 text-foreground"
                      }`}
                      disabled={savingRating}
                      key={score}
                      onClick={() => setDraftScore(score)}
                      type="button"
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <label className="grid gap-2" htmlFor="rating-review">
                  <span className="text-sm text-primary">Review</span>
                  <textarea
                    className="min-h-[132px] w-full resize-y rounded-[18px] border border-foreground/14 bg-white/5 px-[18px] py-4 leading-[1.6] text-foreground/92 placeholder:text-foreground/42 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    disabled={savingRating}
                    id="rating-review"
                    maxLength={2000}
                    onChange={(event) => setDraftReview(event.target.value)}
                    placeholder="What stood out? Mention vocals, arrangement, lyrics, production, or why it belongs in your rotation."
                    value={draftReview}
                  />
                  <span className="text-sm text-foreground/62">
                    {draftReview.length}/2000 characters
                  </span>
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    className={primaryButtonClass}
                    disabled={savingRating || !draftScore}
                    onClick={() => void saveRating(selectedItem)}
                    type="button"
                  >
                    {savingRating ? "Saving..." : "Save Review"}
                  </button>
                  {selectedItem.myRating ? (
                    <button
                      className={ghostButtonClass}
                      disabled={savingRating}
                      onClick={() => void clearRating(selectedItem)}
                      type="button"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="leading-[1.6] text-foreground/82">
            {status === "idle"
              ? initialCopy
              : "Pick a result to inspect its metadata and save it to your catalog."}
          </p>
        )}
      </aside>
    </section>
  );
};

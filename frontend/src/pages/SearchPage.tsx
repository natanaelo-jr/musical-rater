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
  myFavorite?: boolean;
  mySavedAlbum?: boolean;
  metadata?: Record<string, unknown>;
};

type Rating = {
  id: number;
  musicId: number;
  score: number;
  review: string;
};

type Favorite = {
  id: number;
  musicId: number;
};

type SavedAlbum = {
  id: number;
  albumId: number;
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

const Artwork = ({
  item,
  sizeClass = "h-[72px] w-[72px]",
  roundedClass = "rounded-[18px]",
}: {
  item: Pick<CatalogItem, "artworkUrl" | "title" | "type">;
  sizeClass?: string;
  roundedClass?: string;
}) => {
  const [failedUrl, setFailedUrl] = useState<string | undefined>();
  const shouldShowImage = item.artworkUrl && failedUrl !== item.artworkUrl;

  return (
    <div
      className={`${sizeClass} ${roundedClass} grid shrink-0 place-items-center overflow-hidden border border-foreground/10 bg-linear-to-br from-primary/22 via-white/5 to-secondary/24 text-center text-foreground shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.04)]`}
    >
      {shouldShowImage ? (
        <img
          alt={`${item.title} cover`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailedUrl(item.artworkUrl)}
          src={item.artworkUrl}
        />
      ) : (
        <div className="grid gap-1 px-2">
          <span className="text-2xl font-bold">
            {item.type === "album" ? "LP" : "♪"}
          </span>
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-foreground/64">
            No cover
          </span>
        </div>
      )}
    </div>
  );
};

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
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [savingAlbum, setSavingAlbum] = useState(false);
  const [draftScore, setDraftScore] = useState<number | null>(null);
  const [draftReview, setDraftReview] = useState("");
  const requestIdRef = useRef(0);

  const trimmedQuery = query.trim();

  const resetSearchState = (
    nextStatus: "idle" | "error",
    nextMessage: string,
  ) => {
    setResults([]);
    setSelectedItem(null);
    setHasNextPage(false);
    setPage(1);
    setStatus(nextStatus);
    setMessage(nextMessage);
  };

  const handleQueryChange = (value: string) => {
    const nextTrimmedQuery = value.trim();

    setQuery(value);

    if (nextTrimmedQuery.length === 0) {
      resetSearchState("idle", initialCopy);
      return;
    }

    if (nextTrimmedQuery.length < 2) {
      resetSearchState("error", shortQueryCopy);
    }
  };

  const handleTypeChange = (nextType: SearchType) => {
    setType(nextType);

    if (trimmedQuery.length === 0) {
      resetSearchState("idle", initialCopy);
      return;
    }

    if (trimmedQuery.length < 2) {
      resetSearchState("error", shortQueryCopy);
    }
  };

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    if (trimmedQuery.length === 0 || trimmedQuery.length < 2) {
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

  useEffect(() => {
    if (
      !selectedItem?.id ||
      selectedItem.type !== "album" ||
      !selectedItem.imported
    ) {
      return;
    }

    void apiGet<{ savedAlbum: SavedAlbum | null }>(
      `/catalog/albums/saved/${selectedItem.id}`,
    )
      .then((payload) => {
        const isSavedAlbum = Boolean(payload.savedAlbum);
        setResults((current) =>
          current.map((entry) =>
            entry.id === selectedItem.id
              ? { ...entry, mySavedAlbum: isSavedAlbum }
              : entry,
          ),
        );
        setSelectedItem((current) =>
          current && current.id === selectedItem.id
            ? { ...current, mySavedAlbum: isSavedAlbum }
            : current,
        );
      })
      .catch((error: unknown) => {
        setMessage(readError(error));
      });
  }, [selectedItem?.id, selectedItem?.imported, selectedItem?.type]);

  useEffect(() => {
    if (
      !selectedItem?.id ||
      selectedItem.type !== "track" ||
      !selectedItem.imported
    ) {
      return;
    }

    void apiGet<{ favorite: Favorite | null }>(
      `/catalog/favorites/${selectedItem.id}`,
    )
      .then((payload) => {
        const isFavorite = Boolean(payload.favorite);
        setResults((current) =>
          current.map((entry) =>
            entry.id === selectedItem.id
              ? { ...entry, myFavorite: isFavorite }
              : entry,
          ),
        );
        setSelectedItem((current) =>
          current && current.id === selectedItem.id
            ? { ...current, myFavorite: isFavorite }
            : current,
        );
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

  const updateItemFavorite = (itemId: number, myFavorite: boolean) => {
    setResults((current) =>
      current.map((entry) =>
        entry.id === itemId ? { ...entry, myFavorite } : entry,
      ),
    );
    setSelectedItem((current) =>
      current && current.id === itemId ? { ...current, myFavorite } : current,
    );
  };

  const updateItemSavedAlbum = (itemId: number, mySavedAlbum: boolean) => {
    setResults((current) =>
      current.map((entry) =>
        entry.id === itemId ? { ...entry, mySavedAlbum } : entry,
      ),
    );
    setSelectedItem((current) =>
      current && current.id === itemId ? { ...current, mySavedAlbum } : current,
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

  const toggleFavorite = async (item: CatalogItem) => {
    if (!item.id) {
      return;
    }

    setSavingFavorite(true);

    try {
      const nextFavorite = !item.myFavorite;
      await apiRequest<{ favorite: Favorite | null }>(
        `/catalog/favorites/${item.id}`,
        {
          method: nextFavorite ? "POST" : "DELETE",
          body: nextFavorite ? JSON.stringify({}) : undefined,
        },
      );
      updateItemFavorite(item.id, nextFavorite);
      setMessage(
        nextFavorite
          ? `"${item.title}" is in your favorites.`
          : `Removed "${item.title}" from your favorites.`,
      );
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setSavingFavorite(false);
    }
  };

  const toggleSavedAlbum = async (item: CatalogItem) => {
    if (!item.id) {
      return;
    }

    setSavingAlbum(true);

    try {
      const nextSavedAlbum = !item.mySavedAlbum;
      await apiRequest<{ savedAlbum: SavedAlbum | null }>(
        `/catalog/albums/saved/${item.id}`,
        {
          method: nextSavedAlbum ? "POST" : "DELETE",
          body: nextSavedAlbum ? JSON.stringify({}) : undefined,
        },
      );
      updateItemSavedAlbum(item.id, nextSavedAlbum);
      setMessage(
        nextSavedAlbum
          ? `"${item.title}" is on your profile albums.`
          : `Removed "${item.title}" from your profile albums.`,
      );
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setSavingAlbum(false);
    }
  };

  const emptyStateCopy =
    status === "error"
      ? message
      : trimmedQuery.length < 2
        ? shortQueryCopy
        : "No results loaded yet. Search for a title, artist, or album to begin.";

  const closeModal = () => {
    setSelectedItem(null);
  };

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedItem]);

  return (
    <section className="mx-auto grid max-w-[1120px] gap-6">
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
            onChange={(event) => handleQueryChange(event.target.value)}
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
              onClick={() => handleTypeChange(filter.value)}
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
              return (
                <button
                  className="grid w-full items-center gap-4 rounded-[22px] border border-foreground/12 bg-white/4 px-4 py-4 text-left text-foreground transition hover:-translate-y-px hover:border-secondary/60 hover:bg-secondary/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface md:grid-cols-[72px_minmax(0,1fr)_auto]"
                  key={itemKey(item)}
                  onClick={() => setSelectedItem(item)}
                  type="button"
                >
                  <Artwork item={item} />
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
                    {item.myFavorite ? (
                      <span className="rounded-full bg-primary/16 px-3 py-2 text-[0.78rem] font-semibold text-foreground">
                        Favorite
                      </span>
                    ) : null}
                    {item.mySavedAlbum ? (
                      <span className="rounded-full bg-primary/16 px-3 py-2 text-[0.78rem] font-semibold text-foreground">
                        My Album
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

      {selectedItem ? (
        <div
          aria-labelledby="catalog-detail-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/68 px-4 py-6 backdrop-blur-sm"
          onMouseDown={closeModal}
          role="dialog"
        >
          <article
            className="grid max-h-[calc(100vh-3rem)] w-full max-w-[920px] overflow-y-auto rounded-[28px] border border-foreground/12 bg-surface p-5 shadow-[0_32px_100px_rgba(0,0,0,0.45)] sm:p-7"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
              <Artwork
                item={selectedItem}
                roundedClass="rounded-[24px]"
                sizeClass="aspect-square w-full"
              />
              <div className="grid content-start gap-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
                      {selectedItem.type === "track" ? "Track" : "Album"} detail
                    </p>
                    <h2
                      className="m-0 text-[clamp(1.9rem,4vw,3.6rem)] leading-[0.98]"
                      id="catalog-detail-title"
                    >
                      {selectedItem.title}
                    </h2>
                    <p className="mt-3 text-[1.05rem] leading-[1.6] text-foreground/82">
                      {selectedItem.artistName}
                    </p>
                  </div>
                  <button
                    aria-label="Close detail"
                    className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-foreground/14 bg-white/5 text-xl font-bold text-foreground transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={closeModal}
                    type="button"
                  >
                    ×
                  </button>
                </div>

                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] bg-white/4 p-4">
                    <dt className="mb-2 text-sm text-primary">Release</dt>
                    <dd className="m-0 leading-[1.6] text-foreground/82">
                      {formatDate(selectedItem.releaseDate)}
                    </dd>
                  </div>
                  <div className="rounded-[18px] bg-white/4 p-4">
                    <dt className="mb-2 text-sm text-primary">Catalog</dt>
                    <dd className="m-0 leading-[1.6] text-foreground/82">
                      {selectedItem.imported ? "Saved" : "Not saved"}
                    </dd>
                  </div>
                  <div className="rounded-[18px] bg-white/4 p-4">
                    <dt className="mb-2 text-sm text-primary">Provider</dt>
                    <dd className="m-0 leading-[1.6] text-foreground/82">
                      {selectedItem.sourceProvider}
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

                <div className="flex flex-wrap gap-3">
                  <button
                    className={primaryButtonClass}
                    disabled={
                      selectedItem.imported ||
                      importingId === selectedItem.externalId
                    }
                    onClick={() => void importItem(selectedItem)}
                    type="button"
                  >
                    {selectedItem.imported
                      ? "Saved to Catalog"
                      : importingId === selectedItem.externalId
                        ? "Saving..."
                        : "Save to Catalog"}
                  </button>
                  {selectedItem.type === "track" && selectedItem.imported ? (
                    <button
                      className={
                        selectedItem.myFavorite
                          ? ghostButtonClass
                          : primaryButtonClass
                      }
                      disabled={savingFavorite}
                      onClick={() => void toggleFavorite(selectedItem)}
                      type="button"
                    >
                      {savingFavorite
                        ? "Saving..."
                        : selectedItem.myFavorite
                          ? "Favorited"
                          : "Add Favorite"}
                    </button>
                  ) : null}
                  {selectedItem.type === "album" && selectedItem.imported ? (
                    <button
                      className={
                        selectedItem.mySavedAlbum
                          ? ghostButtonClass
                          : primaryButtonClass
                      }
                      disabled={savingAlbum}
                      onClick={() => void toggleSavedAlbum(selectedItem)}
                      type="button"
                    >
                      {savingAlbum
                        ? "Saving..."
                        : selectedItem.mySavedAlbum
                          ? "In My Albums"
                          : "Add to My Albums"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {selectedItem.type === "track" && selectedItem.imported ? (
              <section className="mt-6 grid gap-4 rounded-[24px] border border-foreground/12 bg-white/4 p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="mb-2 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
                      Your review
                    </p>
                    <h3 className="m-0 text-[clamp(1.4rem,2.4vw,2.2rem)] leading-[1.05]">
                      {selectedItem.myRating
                        ? `${selectedItem.myRating}/5 saved`
                        : "Rate this track"}
                    </h3>
                  </div>
                  {selectedItem.myRating ? (
                    <button
                      className={ghostButtonClass}
                      disabled={savingRating}
                      onClick={() => void clearRating(selectedItem)}
                      type="button"
                    >
                      Clear Review
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  <span className="text-sm text-primary">Score</span>
                  <div
                    aria-label="Rate this track"
                    className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap"
                    role="group"
                  >
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        aria-pressed={draftScore === score}
                        className={`min-h-[52px] rounded-[16px] border px-4 py-2 text-lg font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:min-w-[56px] ${
                          draftScore === score
                            ? "border-secondary bg-linear-to-br from-primary/24 to-secondary/30 text-foreground"
                            : "border-foreground/12 bg-foreground/5 text-foreground hover:border-secondary/50"
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
                </div>

                <label className="grid gap-2" htmlFor="rating-review">
                  <span className="text-sm text-primary">Review</span>
                  <textarea
                    className="min-h-[150px] w-full resize-y rounded-[18px] border border-foreground/14 bg-white/5 px-[18px] py-4 leading-[1.6] text-foreground/92 placeholder:text-foreground/42 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
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
                </div>
              </section>
            ) : selectedItem.type === "track" ? (
              <section className="mt-6 rounded-[24px] border border-foreground/12 bg-white/4 p-5">
                <p className="m-0 leading-[1.6] text-foreground/82">
                  Save this track to your catalog before adding a favorite or
                  review.
                </p>
              </section>
            ) : null}
          </article>
        </div>
      ) : null}
    </section>
  );
};

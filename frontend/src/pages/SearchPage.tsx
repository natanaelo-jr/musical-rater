import { useEffect, useState, useTransition } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ApiError, apiRequest } from "../lib/api";

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
  myFavorite?: boolean;
  mySavedAlbum?: boolean;
  metadata?: Record<string, unknown>;
};

type SearchResponse = {
  items: CatalogItem[];
  page: number;
  hasNextPage: boolean;
};

const filters: Array<{ value: SearchType }> = [
  { value: "all" },
  { value: "track" },
  { value: "album" },
];

const shortQueryCopy = "Use at least 2 characters to search the catalog.";

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
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("all");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [importingId, setImportingId] = useState<string | null>(null);
  const [savingRating, setSavingRating] = useState(false);

  const trimmedQuery = query.trim();

  const handleQueryChange = (value: string) => {
    setQuery(value);
  };

  const handleTypeChange = (nextType: SearchType) => {
    setType(nextType);
  };

  useEffect(() => {
    if (trimmedQuery.length === 0) {
      setResults([]);
      setSelectedItem(null);
      setStatus("idle");
      setMessage("");
      return;
    }

    if (trimmedQuery.length < 2) {
      setResults([]);
      setSelectedItem(null);
      setStatus("error");
      setMessage(t("min_chars_search", { defaultValue: shortQueryCopy }));
      return;
    }

    const controller = new AbortController();
    setStatus("loading");
    setMessage(
      t("searching_catalog", {
        defaultValue: `Searching for "${trimmedQuery}"...`,
        query: trimmedQuery,
      }),
    );
    setResults([]);
    setSelectedItem(null);

    const timeoutId = window.setTimeout(() => {
      void apiRequest<SearchResponse>(
        `/catalog/search?q=${encodeURIComponent(trimmedQuery)}&type=${type}&page=1`,
        {
          method: "GET",
          signal: controller.signal,
        },
      )
        .then((payload) => {
          if (controller.signal.aborted) {
            return;
          }

          startTransition(() => {
            setResults(payload.items);
            setSelectedItem((current) => {
              if (!current) {
                return payload.items[0] ?? null;
              }
              return (
                payload.items.find(
                  (item) =>
                    item.externalId === current.externalId &&
                    item.sourceProvider === current.sourceProvider,
                ) ??
                payload.items[0] ??
                null
              );
            });
            setStatus("ready");

            setMessage(
              payload.items.length === 1
                ? t("results_found_singular", {
                    defaultValue: "1 result found.",
                  })
                : payload.items.length > 1
                  ? t("results_found", {
                      count: payload.items.length,
                      defaultValue: "{{count}} results found.",
                    })
                  : t("no_matches_found", {
                      defaultValue: "No matches found.",
                    }),
            );
          });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            return;
          }

          setResults([]);
          setSelectedItem(null);
          setStatus("error");
          setMessage(readError(error));
        });
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [startTransition, t, trimmedQuery, type]);

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

  // --- AS FUNÇÕES DE DAR NOTA QUE SUMIRAM VOLTARAM AQUI! ---
  const updateItemRating = (itemId: number, score?: number) => {
    setResults((current) =>
      current.map((entry) =>
        entry.id === itemId ? { ...entry, myRating: score } : entry,
      ),
    );
    setSelectedItem((current) =>
      current && current.id === itemId
        ? { ...current, myRating: score }
        : current,
    );
  };

  const rateItem = async (item: CatalogItem, score: number) => {
    if (!item.id) return;
    setSavingRating(true);

    try {
      const payload = await apiRequest<{ rating: { score: number } }>(
        `/catalog/ratings/${item.id}`,
        {
          method: "POST",
          body: JSON.stringify({ score }),
        },
      );
      updateItemRating(item.id, payload.rating.score);
      setMessage(`Saved ${payload.rating.score}/5 for "${item.title}".`);
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setSavingRating(false);
    }
  };

  const clearRating = async (item: CatalogItem) => {
    if (!item.id) return;
    setSavingRating(true);

    try {
      await apiRequest<{ rating: null }>(`/catalog/ratings/${item.id}`, {
        method: "DELETE",
      });
      updateItemRating(item.id);
      setMessage(`Cleared your rating for "${item.title}".`);
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setSavingRating(false);
    }
  };
  // ---------------------------------------------------------

  return (
    <main className="shell">
      <section className="search-layout">
        <article className="card search-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t("search_page_eyebrow")}</p>
              <h1>{t("search_page_title")}</h1>
            </div>
            <Link className="ghost-button button-link" to="/app">
              {t("back_to_dashboard")}
            </Link>
          </div>

          <label className="search-input-wrap" htmlFor="catalog-search">
            <span>{t("search_query_label")}</span>
            <input
              id="catalog-search"
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder={t("search_placeholder_catalog")}
              type="search"
              value={query}
            />
          </label>

          <div
            className="filter-row"
            role="tablist"
            aria-label="Search filters"
          >
            {filters.map((filter) => {
              const translationKey =
                filter.value === "all"
                  ? "filter_all"
                  : filter.value === "track"
                    ? "filter_tracks"
                    : "filter_albums";
              return (
                <button
                  aria-selected={type === filter.value}
                  className={
                    type === filter.value ? "filter-chip active" : "filter-chip"
                  }
                  key={filter.value}
                  onClick={() => handleTypeChange(filter.value)}
                  role="tab"
                  type="button"
                >
                  {t(translationKey)}
                </button>
              );
            })}
          </div>

          <p className={status === "error" ? "form-error" : "support-copy"}>
            {status === "idle" && !query ? t("search_help_text") : message}
          </p>

          <div className="results-grid">
          {status !== "loading" &&
            results.map((item) => {
              return (
                <button
                  className="grid w-full items-center gap-4 rounded-[22px] border border-foreground/12 bg-white/4 px-4 py-4 text-left text-foreground transition hover:-translate-y-px hover:border-secondary/60 hover:bg-secondary/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface md:grid-cols-[72px_minmax(0,1fr)_auto]"
                  key={itemKey(item)}
                  onClick={() => setSelectedItem(item)}
                  type="button"
                >
                  <div className="result-cover">
                    {item.artworkUrl ? (
                      <img
                        alt={`${item.title} cover`}
                        loading="lazy"
                        src={item.artworkUrl}
                      />
                    ) : (
                      <div className="result-cover-fallback">
                        {item.type === "album" ? "LP" : "♪"}
                      </div>
                    )}
                  </div>
                  <div className="result-copy">
                    <div className="result-meta-line">
                      <span className="result-type">{item.type}</span>
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
                        {item.type === "album" ? "Album " : ""}Rated{" "}
                        {item.myRating}/5
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
                  <span
                    className={
                      item.imported ? "import-badge imported" : "import-badge"
                    }
                  >
                    {item.imported ? "Imported" : "Remote"}
                  </span>
                </button>
              );
            })}

            {status === "loading" || isPending ? (
              <div className="result-placeholder">
                {t("loading_results", { defaultValue: "Loading results..." })}
              </div>
            ) : null}
            {status === "ready" && results.length === 0 ? (
              <div className="result-placeholder">
                {t("no_matches_query", {
                  defaultValue: "No matches for this query.",
                })}
              </div>
            ) : null}
          </div>
      </article>

      <aside className="card result-detail">
        <p className="eyebrow">{t("selection_eyebrow")}</p>
        {selectedItem ? (
          <>
            <Artwork
              item={selectedItem}
              roundedClass="rounded-[24px]"
              sizeClass="h-[160px] w-[160px]"
            />
            <h2>{selectedItem.title}</h2>
            <p className="lede compact">{selectedItem.artistName}</p>{" "}
            <dl className="detail-grid">
              <div>
                  <dt>Release</dt>
                  <dd>{formatDate(selectedItem.releaseDate)}</dd>
                </div>
                <div>
                  <dt>Provider</dt>
                  <dd>{selectedItem.sourceProvider}</dd>
                </div>
                <div>
                  <dt>Catalog status</dt>
                  <dd>
                    {selectedItem.imported
                      ? "Imported locally"
                      : "Not imported yet"}
                  </dd>
                </div>
                {selectedItem.albumTitle ? (
                  <div>
                    <dt>Album</dt>
                    <dd>{selectedItem.albumTitle}</dd>
                  </div>
                ) : null}
              </dl>
              <button
                className="primary-button"
                disabled={
                  selectedItem.imported ||
                  importingId === selectedItem.externalId
                }
                onClick={() => void importItem(selectedItem)}
                type="button"
              >
                {selectedItem.imported
                  ? "Imported to catalog"
                  : importingId === selectedItem.externalId
                    ? "Importing..."
                    : "Import to local catalog"}
              </button>
              {selectedItem.type === "track" && selectedItem.imported ? (
                <div className="rating-box">
                  <p className="support-copy">Rate this track:</p>
                  <div className="rating-row" aria-label="Rate this track">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        aria-pressed={selectedItem.myRating === score}
                        className={
                          selectedItem.myRating === score
                            ? "rating-button active"
                            : "rating-button"
                        }
                        disabled={savingRating}
                        key={score}
                        onClick={() => void rateItem(selectedItem, score)}
                        type="button"
                      >
                        {score}
                      </button>
                    ))}
                    {selectedItem.myRating ? (
                      <button
                        className="rating-clear-button"
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
            <p className="support-copy">{t("selection_empty_text")}</p>
          )}
        </aside>
      </section>
    </main>
  );
};

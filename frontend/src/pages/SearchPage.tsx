import { useEffect, useState, useTransition } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

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
  metadata?: Record<string, unknown>;
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
  return value;
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

  useEffect(() => {
    const trimmedQuery = query.trim();

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
      setMessage(t("min_chars_search"));
      return;
    }

    setStatus("loading");
    setMessage(t("searching_catalog"));

    const timeoutId = window.setTimeout(() => {
      void apiGet<SearchResponse>(
        `/catalog/search?q=${encodeURIComponent(trimmedQuery)}&type=${type}&page=1`,
      )
        .then((payload) => {
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
                ? t("results_found_singular")
                : payload.items.length > 1
                  ? t("results_found", { count: payload.items.length })
                  : t("no_matches_found"),
            );
          });
        })
        .catch((error: unknown) => {
          setResults([]);
          setSelectedItem(null);
          setStatus("error");
          setMessage(readError(error));
        });
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query, type, t]);

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
          entry.externalId === importedItem.externalId &&
          entry.sourceProvider === importedItem.sourceProvider
            ? { ...entry, ...importedItem, imported: true }
            : entry,
        ),
      );
      setSelectedItem((current) => {
        if (!current) {
          return importedItem;
        }
        if (
          current.externalId === importedItem.externalId &&
          current.sourceProvider === importedItem.sourceProvider
        ) {
          return { ...current, ...importedItem, imported: true };
        }
        return current;
      });
      setMessage(`"${importedItem.title}" is ready in the local catalog.`);
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
              onChange={(event) => setQuery(event.target.value)}
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
                  onClick={() => setType(filter.value)}
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
            {results.map((item) => {
              const isSelected =
                selectedItem?.externalId === item.externalId &&
                selectedItem?.sourceProvider === item.sourceProvider;

              return (
                <button
                  className={isSelected ? "result-card active" : "result-card"}
                  key={`${item.sourceProvider}:${item.externalId}`}
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
                    <strong>{item.title}</strong>
                    <span>{item.artistName}</span>
                    <span>{formatDate(item.releaseDate)}</span>
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
              <div className="result-placeholder">{t("loading_results")}</div>
            ) : null}
            {status === "ready" && results.length === 0 ? (
              <div className="result-placeholder">{t("no_matches_query")}</div>
            ) : null}
          </div>
        </article>

        <aside className="card result-detail">
          <p className="eyebrow">{t("selection_eyebrow")}</p>
          {selectedItem ? (
            <>
              <h2>{selectedItem.title}</h2>
              <p className="lede compact">{selectedItem.artistName}</p>{" "}
              <dl className="detail-grid">
                <div>
                  <dt>Type</dt>
                  <dd>{selectedItem.type}</dd>
                </div>
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

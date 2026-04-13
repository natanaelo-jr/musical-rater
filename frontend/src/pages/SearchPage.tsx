import { useEffect, useState, useTransition } from "react";
import { Link } from "react-router-dom";

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

type Rating = {
  id: number;
  musicId: number;
  score: number;
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
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("all");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [message, setMessage] = useState(
    "Search for songs and albums from the catalog.",
  );
  const [isPending, startTransition] = useTransition();
  const [importingId, setImportingId] = useState<string | null>(null);
  const [savingRating, setSavingRating] = useState(false);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length === 0) {
      setResults([]);
      setSelectedItem(null);
      setStatus("idle");
      setMessage("Search for songs and albums from the catalog.");
      return;
    }

    if (trimmedQuery.length < 2) {
      setResults([]);
      setSelectedItem(null);
      setStatus("error");
      setMessage("Use at least 2 characters to search.");
      return;
    }

    setStatus("loading");
    setMessage("Searching the catalog...");

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
              payload.items.length
                ? `${payload.items.length} result${payload.items.length === 1 ? "" : "s"} found.`
                : "No matches found for this search.",
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
  }, [query, type]);

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
        setResults((current) =>
          current.map((entry) =>
            entry.id === selectedItem.id
              ? { ...entry, myRating: payload.rating?.score }
              : entry,
          ),
        );
        setSelectedItem((current) =>
          current && current.id === selectedItem.id
            ? { ...current, myRating: payload.rating?.score }
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

  const rateItem = async (item: CatalogItem, score: number) => {
    if (!item.id) {
      return;
    }

    setSavingRating(true);

    try {
      const payload = await apiRequest<{ rating: Rating }>(
        `/catalog/ratings/${item.id}`,
        {
          method: "POST",
          body: JSON.stringify({ score }),
        },
      );
      setResults((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, myRating: payload.rating.score }
            : entry,
        ),
      );
      setSelectedItem((current) =>
        current && current.id === item.id
          ? { ...current, myRating: payload.rating.score }
          : current,
      );
      setMessage(`Saved ${payload.rating.score}/5 for "${item.title}".`);
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setSavingRating(false);
    }
  };

  return (
    <main className="shell">
      <section className="search-layout">
        <article className="card search-panel">
          <div className="section-header">
            <div>
              <p className="eyebrow">Catalog search</p>
              <h1>Find the songs and albums you want to rate next.</h1>
            </div>
            <Link className="ghost-button button-link" to="/app">
              Back to dashboard
            </Link>
          </div>

          <label className="search-input-wrap" htmlFor="catalog-search">
            <span>Search query</span>
            <input
              id="catalog-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by song, album, or artist"
              type="search"
              value={query}
            />
          </label>

          <div
            className="filter-row"
            role="tablist"
            aria-label="Search filters"
          >
            {filters.map((filter) => (
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
                {filter.label}
              </button>
            ))}
          </div>

          <p className={status === "error" ? "form-error" : "support-copy"}>
            {message}
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
              <div className="result-placeholder">Loading results...</div>
            ) : null}
            {status === "ready" && results.length === 0 ? (
              <div className="result-placeholder">
                No matches for this query.
              </div>
            ) : null}
          </div>
        </article>

        <aside className="card result-detail">
          <p className="eyebrow">Selection</p>
          {selectedItem ? (
            <>
              <h2>{selectedItem.title}</h2>
              <p className="lede compact">{selectedItem.artistName}</p>
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
                  <p className="support-copy">
                    {selectedItem.myRating
                      ? `Your rating: ${selectedItem.myRating}/5`
                      : "Add a quick rating."}
                  </p>
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
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="support-copy">
              Pick a search result to inspect its metadata and import it to the
              local catalog.
            </p>
          )}
        </aside>
      </section>
    </main>
  );
};

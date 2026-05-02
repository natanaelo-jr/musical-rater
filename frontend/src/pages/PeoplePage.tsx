import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, apiGet, apiRequest } from "../lib/api";

type UserSummary = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  bio: string;
  isFollowing: boolean;
};

type SearchStatus = "idle" | "loading" | "ready" | "error";

const readError = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Unexpected error. Please try again.";
};

export const PeoplePage = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<UserSummary[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [message, setMessage] = useState(
    "Search for listeners by name, username, or email.",
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setPeople([]);
      setStatus("idle");
      setMessage("Search for listeners by name, username, or email.");
      return;
    }

    if (trimmedQuery.length < 2) {
      setPeople([]);
      setStatus("error");
      setMessage("Use at least 2 characters to search.");
      return;
    }

    setStatus("loading");
    setMessage("Looking for listeners...");

    const timeoutId = window.setTimeout(() => {
      void apiGet<{ items: UserSummary[] }>(
        `/social/users?q=${encodeURIComponent(trimmedQuery)}`,
      )
        .then((payload) => {
          setPeople(payload.items);
          setStatus("ready");
          setMessage(
            payload.items.length
              ? `${payload.items.length} listener${payload.items.length === 1 ? "" : "s"} found.`
              : "No listeners found for this search.",
          );
        })
        .catch((error: unknown) => {
          setPeople([]);
          setStatus("error");
          setMessage(readError(error));
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  const setFollowing = (userId: string, isFollowing: boolean) => {
    setPeople((current) =>
      current.map((person) =>
        person.id === userId ? { ...person, isFollowing } : person,
      ),
    );
  };

  const followPerson = async (person: UserSummary) => {
    setUpdatingId(person.id);

    try {
      await apiRequest(`/social/following/${person.id}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setFollowing(person.id, true);
      setMessage(`You are following ${person.displayName}.`);
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setUpdatingId(null);
    }
  };

  const unfollowPerson = async (person: UserSummary) => {
    setUpdatingId(person.id);

    try {
      await apiRequest(`/social/following/${person.id}`, {
        method: "DELETE",
      });
      setFollowing(person.id, false);
      setMessage(`You stopped following ${person.displayName}.`);
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <main className="shell">
      <section className="card people-panel">
        <div className="section-header">
          <div>
            <p className="eyebrow">{t("people_eyebrow")}</p>
            <h1>{t("people_title")}</h1>
          </div>
          <Link className="ghost-button button-link" to="/app">
            {t("back_to_dashboard")}
          </Link>
        </div>

        <label className="search-input-wrap" htmlFor="people-search">
          <span>{t("search_listeners_label")}</span>
          <input
            id="people-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search_listeners_placeholder")}
            type="search"
            value={query}
          />
        </label>

        <p className={status === "error" ? "form-error" : "support-copy"}>
          {status === "idle" && !query ? t("search_listeners_help") : message}
        </p>

        <div className="people-list">
          {people.map((person) => (
            <article className="person-card" key={person.id}>
              <div className="person-avatar">
                {person.avatarUrl ? (
                  <img
                    alt={`${person.displayName} avatar`}
                    src={person.avatarUrl}
                  />
                ) : (
                  <span>{person.displayName.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="person-copy">
                <strong>{person.displayName}</strong>
                <span>
                  {person.username ? `@${person.username}` : "No username yet"}
                </span>
                {person.bio ? <p>{person.bio}</p> : null}
              </div>
              <button
                className={
                  person.isFollowing ? "ghost-button" : "primary-button"
                }
                disabled={updatingId === person.id}
                onClick={() =>
                  void (person.isFollowing
                    ? unfollowPerson(person)
                    : followPerson(person))
                }
                type="button"
              >
                {updatingId === person.id
                  ? "Saving..."
                  : person.isFollowing
                    ? "Following"
                    : "Follow"}
              </button>
            </article>
          ))}

          {status === "loading" ? (
            <div className="result-placeholder">Searching listeners...</div>
          ) : null}
        </div>
      </section>
    </main>
  );
};

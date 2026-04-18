import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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

const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full bg-primary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export const PeoplePage = () => {
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
    <section className="mx-auto grid max-w-[1120px] gap-6">
      <article className="rounded-[28px] border border-foreground/12 bg-panel p-8 shadow-panel backdrop-blur-[20px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
              People
            </p>
            <h1 className="m-0 text-[clamp(2rem,4vw,4rem)] leading-[0.98]">
              Find listeners to follow.
            </h1>
          </div>
          <Link className="font-semibold text-primary" to="/app">
            Back to dashboard
          </Link>
        </div>

        <label className="mt-8 grid gap-2.5" htmlFor="people-search">
          <span className="text-sm text-primary">Search listeners</span>
          <input
            className="w-full rounded-[18px] border border-foreground/14 bg-white/5 px-[18px] py-4 text-foreground/92 placeholder:text-foreground/42 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            id="people-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, username, or email"
            type="search"
            value={query}
          />
        </label>

        <p
          className={`mt-4 leading-[1.6] ${
            status === "error" ? "text-danger" : "text-foreground/82"
          }`}
        >
          {message}
        </p>

        <div className="mt-6 grid gap-4">
          {people.map((person) => (
            <article
              className="grid gap-4 rounded-[22px] border border-foreground/12 bg-white/4 p-5 md:grid-cols-[72px_minmax(0,1fr)_auto] md:items-center"
              key={person.id}
            >
              <div className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-[18px] bg-linear-to-br from-primary/28 to-secondary/28 text-xl font-bold text-foreground">
                {person.avatarUrl ? (
                  <img
                    alt={`${person.displayName} avatar`}
                    className="h-full w-full object-cover"
                    src={person.avatarUrl}
                  />
                ) : (
                  <span>{person.displayName.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="grid gap-1.5">
                <strong>{person.displayName}</strong>
                <span className="text-foreground/72">
                  {person.username ? `@${person.username}` : "No username yet"}
                </span>
                {person.bio ? (
                  <p className="m-0 leading-[1.6] text-foreground/82">{person.bio}</p>
                ) : null}
              </div>
              <button
                className={person.isFollowing ? ghostButtonClass : primaryButtonClass}
                disabled={updatingId === person.id}
                onClick={() =>
                  void (person.isFollowing ? unfollowPerson(person) : followPerson(person))
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
            <div className="rounded-[22px] border border-dashed border-foreground/12 bg-white/3 p-7 text-center text-foreground/72">
              Searching listeners...
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
};

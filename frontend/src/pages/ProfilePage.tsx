import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { toFieldErrors } from "../auth/authErrors";
import { useAuth } from "../auth/useAuth";
import { focusFirstFieldError } from "../components/formUtils";
import { Field, TextAreaField } from "../components/forms";
import { ApiError, apiGet, apiRequest } from "../lib/api";

const cardClass =
  "mx-auto w-full max-w-[640px] rounded-[28px] border border-foreground/12 bg-panel p-8 shadow-panel backdrop-blur-[20px]";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full bg-primary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

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
  imported: boolean;
};

type Favorite = {
  id: number;
  position: number | null;
  item: CatalogItem;
};

type SearchResponse = {
  items: CatalogItem[];
};

const readError = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Unexpected error. Please try again.";
};

const itemKey = (item: CatalogItem) =>
  `${item.type}:${item.sourceProvider}:${item.externalId}`;

export const ProfilePage = () => {
  const auth = useAuth();
  const user = auth.user;
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoritesMessage, setFavoritesMessage] = useState(
    "Search the catalog and pin the albums or tracks you want visible on your profile.",
  );
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesQuery, setFavoritesQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CatalogItem[]>([]);
  const [searchStatus, setSearchStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [favoriteBusyKey, setFavoriteBusyKey] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    window.setTimeout(() => {
      setDisplayName(user?.displayName ?? "");
      setUsername(user?.username ?? "");
      setAvatarUrl(user?.avatarUrl ?? "");
      setBio(user?.bio ?? "");
    }, 0);
  }, [user]);

  const handleFavoritesQueryChange = (value: string) => {
    const trimmedQuery = value.trim();

    setFavoritesQuery(value);

    if (!trimmedQuery) {
      setSearchResults([]);
      setSearchStatus("idle");
      return;
    }

    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      setSearchStatus("error");
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadFavorites = async () => {
      setFavoritesLoading(true);

      try {
        const payload = await apiGet<{ items: Favorite[] }>(
          "/catalog/favorites",
        );
        setFavorites(payload.items);
      } catch (error: unknown) {
        setFavoritesMessage(readError(error));
      } finally {
        setFavoritesLoading(false);
      }
    };

    void loadFavorites();
  }, [user]);

  useEffect(() => {
    const trimmedQuery = favoritesQuery.trim();
    const requestId = ++requestIdRef.current;

    if (!trimmedQuery || trimmedQuery.length < 2) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSearchStatus("loading");

      void apiGet<SearchResponse>(
        `/catalog/search?q=${encodeURIComponent(trimmedQuery)}&type=all&page=1`,
      )
        .then((payload) => {
          if (requestId !== requestIdRef.current) {
            return;
          }

          setSearchResults(payload.items);
          setSearchStatus("ready");
        })
        .catch((error: unknown) => {
          if (requestId !== requestIdRef.current) {
            return;
          }

          setSearchResults([]);
          setSearchStatus("error");
          setFavoritesMessage(readError(error));
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [favoritesQuery]);

  if (!user) {
    return null;
  }

  const favoriteKeys = new Set(
    favorites.map((favorite) => itemKey(favorite.item)),
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setSuccess("");

    try {
      await auth.updateProfile({ displayName, username, avatarUrl, bio });
      setSuccess(
        "Profile updated. Your workspace now reflects the new details.",
      );
    } catch (error) {
      const nextErrors = toFieldErrors(error);
      setErrors(nextErrors);
      focusFirstFieldError(nextErrors);
    } finally {
      setSubmitting(false);
    }
  };

  const addFavorite = async (item: CatalogItem) => {
    const key = itemKey(item);
    setFavoriteBusyKey(key);

    try {
      const payload = await apiRequest<{ favorite: Favorite }>(
        "/catalog/favorites",
        {
          method: "POST",
          body: JSON.stringify({
            source_provider: item.sourceProvider,
            external_id: item.externalId,
            type: item.type,
          }),
        },
      );

      setFavorites((current) => {
        const withoutDuplicate = current.filter(
          (favorite) =>
            itemKey(favorite.item) !== itemKey(payload.favorite.item),
        );
        return [...withoutDuplicate, payload.favorite].sort(
          (left, right) => (left.position ?? 0) - (right.position ?? 0),
        );
      });
      setFavoritesMessage(`"${item.title}" is now featured on your profile.`);
    } catch (error) {
      setFavoritesMessage(readError(error));
    } finally {
      setFavoriteBusyKey(null);
    }
  };

  const removeFavorite = async (favorite: Favorite) => {
    setFavoriteBusyKey(`favorite:${favorite.id}`);

    try {
      await apiRequest(`/catalog/favorites/${favorite.id}`, {
        method: "DELETE",
      });
      setFavorites((current) =>
        current.filter((entry) => entry.id !== favorite.id),
      );
      setFavoritesMessage(
        `Removed "${favorite.item.title}" from your profile.`,
      );
    } catch (error) {
      setFavoritesMessage(readError(error));
    } finally {
      setFavoriteBusyKey(null);
    }
  };

  return (
    <section className="mx-auto grid w-full max-w-[1120px] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <article className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
              Edit profile
            </p>
            <h1 className="m-0 text-[clamp(2rem,3vw,3rem)] leading-[0.98]">
              Set the details that identify you in the app.
            </h1>
            <p className="mt-4 leading-[1.6] text-foreground/82">
              Use a clear name, a recognizable handle, and a short bio so your
              account feels finished.
            </p>
          </div>
        </div>
        <form className="mt-7 grid gap-[18px]" onSubmit={submit}>
          <Field
            autoComplete="name"
            error={errors.display_name}
            helperText="Shown in the app and on future profile surfaces."
            label="Display name"
            name="display_name"
            onChange={setDisplayName}
            value={displayName}
          />
          <Field
            autoComplete="username"
            error={errors.username}
            helperText="Use the handle people will recognize when they browse your profile."
            label="Username"
            name="username"
            onChange={setUsername}
            placeholder="stage-door-fan..."
            spellCheck={false}
            value={username}
          />
          <Field
            autoComplete="url"
            error={errors.avatar_url}
            helperText="Paste a direct link to an image file."
            label="Avatar URL"
            name="avatar_url"
            onChange={setAvatarUrl}
            placeholder="https://example.com/avatar.jpg..."
            spellCheck={false}
            type="url"
            value={avatarUrl}
          />
          <TextAreaField
            autoComplete="off"
            error={errors.bio}
            helperText="Share what you like to rate, collect, or revisit."
            label="Bio"
            name="bio"
            onChange={setBio}
            placeholder="Share your favorite cast recordings..."
            value={bio}
          />
          {errors.form ? (
            <p aria-live="polite" className="text-danger">
              {errors.form}
            </p>
          ) : null}
          {success ? (
            <p aria-live="polite" className="text-success">
              {success}
            </p>
          ) : null}
          <button
            className={primaryButtonClass}
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </article>

      <aside className={cardClass}>
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
          Favorites
        </p>
        <h2 className="m-0 text-[clamp(1.7rem,2.5vw,2.5rem)] leading-[1.02]">
          Feature the music that should represent your taste.
        </h2>
        <p className="mt-4 leading-[1.6] text-foreground/82">
          {favoritesMessage}
        </p>

        <div className="mt-6 grid gap-2.5">
          <label className="text-sm text-primary" htmlFor="favorite-search">
            Search tracks and albums
          </label>
          <input
            className="w-full rounded-2xl border border-foreground/14 bg-white/4 px-4 py-[14px] text-foreground/82 placeholder:text-foreground/42 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
            id="favorite-search"
            onChange={(event) => handleFavoritesQueryChange(event.target.value)}
            placeholder="Search the catalog to add favorites..."
            type="search"
            value={favoritesQuery}
          />
          <small className="leading-6 text-foreground/68">
            Search by title, artist, album, or show.
          </small>
        </div>

        <div className="mt-6 grid gap-3">
          {searchStatus === "loading" ? (
            <div className="rounded-[22px] border border-dashed border-foreground/12 bg-white/3 p-5 text-center text-foreground/72">
              Searching the catalog...
            </div>
          ) : null}

          {favoritesQuery.trim().length === 1 ? (
            <div className="rounded-[22px] border border-dashed border-foreground/12 bg-white/3 p-5 text-center text-foreground/72">
              Use at least 2 characters to search.
            </div>
          ) : null}

          {searchStatus === "ready" && searchResults.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-foreground/12 bg-white/3 p-5 text-center text-foreground/72">
              No matches found for this search.
            </div>
          ) : null}

          {searchResults.map((item) => {
            const key = itemKey(item);
            const isSaved = favoriteKeys.has(key);

            return (
              <article
                className="grid gap-3 rounded-[22px] border border-foreground/12 bg-white/4 p-4"
                key={key}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="grid gap-1">
                    <strong>{item.title}</strong>
                    <span className="text-foreground/78">
                      {item.artistName}
                    </span>
                    <span className="text-sm text-foreground/62">
                      {item.type === "track" && item.albumTitle
                        ? `${item.type} · ${item.albumTitle}`
                        : item.type}
                    </span>
                  </div>
                  <button
                    className={isSaved ? ghostButtonClass : primaryButtonClass}
                    disabled={isSaved || favoriteBusyKey === key}
                    onClick={() => void addFavorite(item)}
                    type="button"
                  >
                    {favoriteBusyKey === key
                      ? "Saving..."
                      : isSaved
                        ? "Featured"
                        : "Feature"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8">
          <h3 className="m-0 text-[1.15rem] text-foreground">
            Visible on your profile
          </h3>
          <div className="mt-4 grid gap-3">
            {favoritesLoading ? (
              <div className="rounded-[22px] border border-dashed border-foreground/12 bg-white/3 p-5 text-center text-foreground/72">
                Loading favorites...
              </div>
            ) : null}

            {!favoritesLoading && favorites.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-foreground/12 bg-white/3 p-5 text-center text-foreground/72">
                No favorites selected yet.
              </div>
            ) : null}

            {favorites.map((favorite) => (
              <article
                className="grid gap-3 rounded-[22px] border border-foreground/12 bg-white/4 p-4"
                key={favorite.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="grid gap-1">
                    <strong>{favorite.item.title}</strong>
                    <span className="text-foreground/78">
                      {favorite.item.artistName}
                    </span>
                    <span className="text-sm text-foreground/62">
                      {favorite.item.type === "track" &&
                      favorite.item.albumTitle
                        ? `${favorite.item.type} · ${favorite.item.albumTitle}`
                        : favorite.item.type}
                    </span>
                  </div>
                  <button
                    className={ghostButtonClass}
                    disabled={favoriteBusyKey === `favorite:${favorite.id}`}
                    onClick={() => void removeFavorite(favorite)}
                    type="button"
                  >
                    {favoriteBusyKey === `favorite:${favorite.id}`
                      ? "Removing..."
                      : "Remove"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
};

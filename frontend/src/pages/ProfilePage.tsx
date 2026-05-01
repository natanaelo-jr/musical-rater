import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { toFieldErrors } from "../auth/authErrors";
import { useAuth } from "../auth/useAuth";
import { focusFirstFieldError } from "../components/formUtils";
import { Field, TextAreaField } from "../components/forms";
import { apiGet } from "../lib/api";

type RatingSummary = {
  id: number;
  musicId: number;
  score: number;
  review: string;
  title: string;
  artistName: string;
  albumTitle?: string;
  artworkUrl?: string;
};

type FavoriteSummary = {
  id: number;
  musicId: number;
  title: string;
  artistName: string;
  albumTitle?: string;
  artworkUrl?: string;
};

const cardClass =
  "rounded-[28px] border border-foreground/12 bg-panel p-8 shadow-panel backdrop-blur-[20px]";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full bg-primary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

const initials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "MR";

const artwork = (
  item: { title: string; artworkUrl?: string },
  size = "h-14 w-14",
) => (
  <div
    className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-[16px] bg-linear-to-br from-primary/24 to-secondary/24 text-xl font-bold`}
  >
    {item.artworkUrl ? (
      <img
        alt={`${item.title} cover`}
        className="h-full w-full object-cover"
        loading="lazy"
        src={item.artworkUrl}
      />
    ) : (
      <span>♪</span>
    )}
  </div>
);

export const ProfilePage = () => {
  const auth = useAuth();
  const user = auth.user;
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [ratings, setRatings] = useState<RatingSummary[]>([]);
  const [favorites, setFavorites] = useState<FavoriteSummary[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setUsername(user?.username ?? "");
    setAvatarUrl(user?.avatarUrl ?? "");
    setBio(user?.bio ?? "");
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void apiGet<{ items: RatingSummary[] }>("/catalog/ratings")
      .then((payload) => setRatings(payload.items))
      .catch(() => setRatings([]));

    void apiGet<{ items: FavoriteSummary[] }>("/catalog/favorites")
      .then((payload) => setFavorites(payload.items))
      .catch(() => setFavorites([]));
  }, [user]);

  if (!user) {
    return null;
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setSuccess("");

    try {
      await auth.updateProfile({ displayName, username, avatarUrl, bio });
      setSuccess("Profile updated.");
      setShowSettings(false);
    } catch (error) {
      const nextErrors = toFieldErrors(error);
      setErrors(nextErrors);
      focusFirstFieldError(nextErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto grid max-w-[1120px] gap-6">
      <article className={`${cardClass} grid gap-7`}>
        <div className="grid gap-6 lg:grid-cols-[128px_minmax(0,1fr)_auto] lg:items-start">
          <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-[26px] bg-linear-to-br from-primary/28 to-secondary/28 text-4xl font-bold">
            {user.avatarUrl ? (
              <img
                alt={`${user.displayName} avatar`}
                className="h-full w-full object-cover"
                src={user.avatarUrl}
              />
            ) : (
              <span>{initials(user.displayName || user.email)}</span>
            )}
          </div>

          <div className="min-w-0">
            <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
              My profile
            </p>
            <h1 className="m-0 overflow-hidden text-ellipsis text-[clamp(2.2rem,5vw,5rem)] leading-[0.96]">
              {user.displayName || "Your profile"}
            </h1>
            <p className="mt-3 text-[1.05rem] text-foreground/72">
              {user.username ? `@${user.username}` : user.email}
            </p>
            <p className="mt-5 max-w-[48rem] text-[1.05rem] leading-[1.7] text-foreground/84">
              {user.bio || "Add a short bio so people understand your taste."}
            </p>
          </div>

          <button
            className={showSettings ? ghostButtonClass : primaryButtonClass}
            onClick={() => setShowSettings((current) => !current)}
            type="button"
          >
            {showSettings ? "Close Settings" : "Profile Settings"}
          </button>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          {[
            ["Reviews", ratings.length],
            ["Favorites", favorites.length],
            ["Profile", user.username && user.bio ? "Ready" : "Needs info"],
          ].map(([label, value]) => (
            <div className="rounded-[20px] bg-white/4 p-5" key={label}>
              <dt className="mb-2 text-sm text-primary">{label}</dt>
              <dd className="m-0 text-2xl font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </article>

      {showSettings ? (
        <section className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
                Settings
              </p>
              <h2 className="m-0 text-[clamp(1.7rem,3vw,3rem)] leading-[1]">
                Edit the details people see on your profile.
              </h2>
            </div>
          </div>
          <form className="mt-7 grid gap-[18px]" onSubmit={submit}>
            <Field
              autoComplete="name"
              error={errors.display_name}
              helperText="Shown in the app and on profile surfaces."
              label="Display name"
              name="display_name"
              onChange={setDisplayName}
              value={displayName}
            />
            <Field
              autoComplete="username"
              error={errors.username}
              helperText="Use the handle people will recognize."
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
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className={`${cardClass} grid gap-5`}>
          <div>
            <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
              Latest reviews
            </p>
            <h2 className="m-0 text-[clamp(1.6rem,3vw,3rem)] leading-[1.02]">
              Recent thoughts
            </h2>
          </div>
          {ratings.length ? (
            <div className="grid gap-4">
              {ratings.map((rating) => (
                <article
                  className="grid gap-4 rounded-[22px] border border-foreground/12 bg-white/4 p-5 sm:grid-cols-[64px_minmax(0,1fr)_auto]"
                  key={rating.id}
                >
                  {artwork(rating, "h-16 w-16")}
                  <div className="min-w-0">
                    <h3 className="m-0 overflow-hidden text-ellipsis text-xl">
                      {rating.title}
                    </h3>
                    <p className="mt-1 text-foreground/76">
                      {rating.artistName}
                      {rating.albumTitle ? ` · ${rating.albumTitle}` : ""}
                    </p>
                    <p className="mt-3 line-clamp-3 leading-[1.6] text-foreground/82">
                      {rating.review || "No written review yet."}
                    </p>
                  </div>
                  <span className="h-fit w-fit rounded-full bg-secondary/16 px-3 py-2 text-sm font-semibold">
                    {rating.score}/5
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-foreground/12 bg-white/3 p-7 text-center text-foreground/72">
              Your latest reviews will appear here after you rate tracks.
            </div>
          )}
        </section>

        <aside className={`${cardClass} grid content-start gap-5`}>
          <div>
            <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
              Favorites
            </p>
            <h2 className="m-0 text-[clamp(1.6rem,2.4vw,2.4rem)] leading-[1.05]">
              Profile pins
            </h2>
          </div>
          {favorites.length ? (
            <div className="grid gap-3">
              {favorites.map((favorite) => (
                <article
                  className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 rounded-[18px] bg-white/4 p-3"
                  key={favorite.id}
                >
                  {artwork(favorite)}
                  <div className="min-w-0">
                    <h3 className="m-0 overflow-hidden text-ellipsis text-base">
                      {favorite.title}
                    </h3>
                    <p className="m-0 overflow-hidden text-ellipsis text-sm text-foreground/72">
                      {favorite.artistName}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-dashed border-foreground/12 bg-white/3 p-7 text-center text-foreground/72">
              Favorite imported tracks from search to pin them here.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError, apiGet, apiRequest } from "../lib/api";

type PublicProfile = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  bio: string;
  isSelf: boolean;
  isFollowing: boolean;
  stats: {
    ratings: number;
    following: number;
    followers: number;
  };
};

type PublicRating = {
  id: number;
  musicId: number;
  score: number;
  review: string;
  updatedAt: string;
  title: string;
  artistName: string;
  albumTitle?: string;
  artworkUrl?: string;
};

type ProfileResponse = {
  profile: PublicProfile;
  ratings: PublicRating[];
};

const readError = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Unexpected error. Please try again.";
};

const cardClass =
  "rounded-[28px] border border-foreground/12 bg-panel p-8 shadow-panel backdrop-blur-[20px]";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full bg-primary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "MR";

export const PublicProfilePage = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [ratings, setRatings] = useState<PublicRating[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Loading profile...");
  const [updatingFollow, setUpdatingFollow] = useState(false);

  useEffect(() => {
    if (!userId) {
      setStatus("error");
      setMessage("Profile not found.");
      return;
    }

    setStatus("loading");
    setMessage("Loading profile...");

    void apiGet<ProfileResponse>(`/social/users/${userId}`)
      .then((payload) => {
        setProfile(payload.profile);
        setRatings(payload.ratings);
        setStatus("ready");
        setMessage("");
      })
      .catch((error: unknown) => {
        setProfile(null);
        setRatings([]);
        setStatus("error");
        setMessage(readError(error));
      });
  }, [userId]);

  const setFollowing = async (isFollowing: boolean) => {
    if (!profile) {
      return;
    }

    setUpdatingFollow(true);

    try {
      await apiRequest(`/social/following/${profile.id}`, {
        method: isFollowing ? "POST" : "DELETE",
        body: isFollowing ? JSON.stringify({}) : undefined,
      });
      setProfile((current) =>
        current
          ? {
              ...current,
              isFollowing,
              stats: {
                ...current.stats,
                followers: current.stats.followers + (isFollowing ? 1 : -1),
              },
            }
          : current,
      );
    } catch (error) {
      setMessage(readError(error));
    } finally {
      setUpdatingFollow(false);
    }
  };

  if (status === "loading") {
    return (
      <section className={cardClass}>
        <p className="m-0 text-foreground/82">Loading profile...</p>
      </section>
    );
  }

  if (status === "error" || !profile) {
    return (
      <section className={cardClass}>
        <p className="mb-5 text-danger">{message}</p>
        <Link className={ghostButtonClass} to="/app/people">
          Back to People
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-[1120px] gap-6">
      <article className={`${cardClass} grid gap-7`}>
        <div className="grid gap-6 lg:grid-cols-[132px_minmax(0,1fr)_auto] lg:items-start">
          <div className="grid h-[132px] w-[132px] place-items-center overflow-hidden rounded-[26px] bg-linear-to-br from-primary/28 to-secondary/28 text-4xl font-bold text-foreground">
            {profile.avatarUrl ? (
              <img
                alt={`${profile.displayName} avatar`}
                className="h-full w-full object-cover"
                src={profile.avatarUrl}
              />
            ) : (
              <span>{initials(profile.displayName)}</span>
            )}
          </div>

          <div className="min-w-0">
            <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
              Listener profile
            </p>
            <h1 className="m-0 overflow-hidden text-ellipsis text-[clamp(2.2rem,5vw,5rem)] leading-[0.96]">
              {profile.displayName}
            </h1>
            <p className="mt-3 text-[1.05rem] text-foreground/72">
              {profile.username ? `@${profile.username}` : "No username yet"}
            </p>
            {profile.bio ? (
              <p className="mt-5 max-w-[48rem] text-[1.05rem] leading-[1.7] text-foreground/84">
                {profile.bio}
              </p>
            ) : (
              <p className="mt-5 max-w-[48rem] text-[1.05rem] leading-[1.7] text-foreground/64">
                This listener has not added a bio yet.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end">
            {profile.isSelf ? (
              <Link className={primaryButtonClass} to="/app/profile">
                Edit Profile
              </Link>
            ) : (
              <button
                className={
                  profile.isFollowing ? ghostButtonClass : primaryButtonClass
                }
                disabled={updatingFollow}
                onClick={() => void setFollowing(!profile.isFollowing)}
                type="button"
              >
                {updatingFollow
                  ? "Saving..."
                  : profile.isFollowing
                    ? "Following"
                    : "Follow"}
              </button>
            )}
            <Link className={ghostButtonClass} to="/app/people">
              Find People
            </Link>
          </div>
        </div>

        {message ? <p className="m-0 text-danger">{message}</p> : null}

        <dl className="grid gap-3 sm:grid-cols-3">
          {[
            ["Ratings", profile.stats.ratings],
            ["Followers", profile.stats.followers],
            ["Following", profile.stats.following],
          ].map(([label, value]) => (
            <div className="rounded-[20px] bg-white/4 p-5" key={label}>
              <dt className="mb-2 text-sm text-primary">{label}</dt>
              <dd className="m-0 text-3xl font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </article>

      <section className={`${cardClass} grid gap-5`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
              Recent reviews
            </p>
            <h2 className="m-0 text-[clamp(1.6rem,3vw,3rem)] leading-[1.02]">
              What {profile.displayName} has been listening to
            </h2>
          </div>
        </div>

        {ratings.length ? (
          <div className="grid gap-4">
            {ratings.map((rating) => (
              <article
                className="grid gap-4 rounded-[22px] border border-foreground/12 bg-white/4 p-5 md:grid-cols-[76px_minmax(0,1fr)_auto]"
                key={rating.id}
              >
                <div className="h-[76px] w-[76px] overflow-hidden rounded-[18px] bg-linear-to-br from-primary/24 to-secondary/24">
                  {rating.artworkUrl ? (
                    <img
                      alt={`${rating.title} cover`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      src={rating.artworkUrl}
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-2xl font-bold">
                      ♪
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="m-0 overflow-hidden text-ellipsis text-xl">
                    {rating.title}
                  </h3>
                  <p className="mt-1 text-foreground/76">
                    {rating.artistName}
                    {rating.albumTitle ? ` · ${rating.albumTitle}` : ""}
                  </p>
                  {rating.review ? (
                    <p className="mt-4 leading-[1.7] text-foreground/86">
                      {rating.review}
                    </p>
                  ) : (
                    <p className="mt-4 leading-[1.7] text-foreground/62">
                      No written review yet.
                    </p>
                  )}
                </div>
                <div className="grid content-start gap-2 md:justify-items-end">
                  <span className="w-fit rounded-full bg-secondary/16 px-3 py-2 text-sm font-semibold text-foreground">
                    {rating.score}/5
                  </span>
                  <time className="text-sm text-foreground/62">
                    {formatDate(rating.updatedAt)}
                  </time>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed border-foreground/12 bg-white/3 p-7 text-center text-foreground/72">
            No reviews yet.
          </div>
        )}
      </section>
    </section>
  );
};

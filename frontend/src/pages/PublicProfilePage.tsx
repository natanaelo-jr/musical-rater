import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { RatingCommentsSection } from "../components/RatingCommentsSection";
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
    albums: number;
    following: number;
    followers: number;
  };
};

type PublicReviewItem = {
  kind: "track" | "album";
  id: number;
  musicId: number | null;
  albumId: number | null;
  score: number;
  review: string;
  updatedAt: string;
  title: string;
  artistName: string;
  albumTitle?: string | null;
  artworkUrl?: string;
};

type PublicSavedAlbum = {
  id: number;
  albumId: number;
  title: string;
  artistName: string;
  artworkUrl?: string;
  releaseDate?: string;
};

type ProfileResponse = {
  profile: PublicProfile;
  ratings: PublicReviewItem[];
  savedAlbums: PublicSavedAlbum[];
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
const PROFILE_SECTION_STEP = 3;

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
  const [ratings, setRatings] = useState<PublicReviewItem[]>([]);
  const [savedAlbums, setSavedAlbums] = useState<PublicSavedAlbum[]>([]);
  const [visibleRatings, setVisibleRatings] = useState(PROFILE_SECTION_STEP);
  const [visibleSavedAlbums, setVisibleSavedAlbums] =
    useState(PROFILE_SECTION_STEP);
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
        setSavedAlbums(payload.savedAlbums);
        setVisibleRatings(PROFILE_SECTION_STEP);
        setVisibleSavedAlbums(PROFILE_SECTION_STEP);
        setStatus("ready");
        setMessage("");
      })
      .catch((error: unknown) => {
        setProfile(null);
        setRatings([]);
        setSavedAlbums([]);
        setStatus("error");
        setMessage(readError(error));
      });
  }, [userId]);

  const visibleRatingsItems = ratings.slice(0, visibleRatings);
  const visibleSavedAlbumItems = savedAlbums.slice(0, visibleSavedAlbums);

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
            ["Albums", profile.stats.albums],
            ["Followers", profile.stats.followers],
          ].map(([label, value]) => (
            <div className="rounded-[20px] bg-white/4 p-5" key={label}>
              <dt className="mb-2 text-sm text-primary">{label}</dt>
              <dd className="m-0 text-3xl font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </article>

      <section className={`${cardClass} grid gap-5`}>
        <div>
          <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
            Saved albums
          </p>
          <h2 className="m-0 text-[clamp(1.6rem,3vw,3rem)] leading-[1.02]">
            Albums on {profile.displayName}'s profile
          </h2>
        </div>

        {savedAlbums.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleSavedAlbumItems.map((album) => (
                <article
                  className="grid gap-4 rounded-[22px] border border-foreground/12 bg-white/4 p-4"
                  key={album.id}
                >
                  <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-[18px] bg-linear-to-br from-primary/24 to-secondary/24 text-3xl font-bold">
                    {album.artworkUrl ? (
                      <img
                        alt={`${album.title} cover`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        src={album.artworkUrl}
                      />
                    ) : (
                      <span>LP</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="m-0 overflow-hidden text-ellipsis text-xl">
                      {album.title}
                    </h3>
                    <p className="mt-1 overflow-hidden text-ellipsis text-foreground/76">
                      {album.artistName}
                    </p>
                    {album.releaseDate ? (
                      <p className="mt-2 text-sm text-foreground/62">
                        {album.releaseDate}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
            {savedAlbums.length > visibleSavedAlbumItems.length ? (
              <button
                className={ghostButtonClass}
                onClick={() =>
                  setVisibleSavedAlbums((count) => count + PROFILE_SECTION_STEP)
                }
                type="button"
              >
                Load More Albums
              </button>
            ) : null}
          </>
        ) : (
          <div className="rounded-[22px] border border-dashed border-foreground/12 bg-white/3 p-7 text-center text-foreground/72">
            No saved albums yet.
          </div>
        )}
      </section>

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
          <>
            <div className="grid gap-4">
              {visibleRatingsItems.map((rating) => (
                <article
                  className="grid gap-4 rounded-[22px] border border-foreground/12 bg-white/4 p-5 md:grid-cols-[76px_minmax(0,1fr)_auto]"
                  key={`${rating.kind}-${rating.id}`}
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
                        {rating.kind === "album" ? "LP" : "♪"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1 text-[0.7rem] uppercase tracking-[0.12em] text-primary">
                      {rating.kind === "album" ? "Album" : "Track"}
                    </p>
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
                  <div className="md:col-span-3">
                    {rating.kind === "track" ? (
                      <RatingCommentsSection ratingId={rating.id} />
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
            {ratings.length > visibleRatingsItems.length ? (
              <button
                className={ghostButtonClass}
                onClick={() =>
                  setVisibleRatings((count) => count + PROFILE_SECTION_STEP)
                }
                type="button"
              >
                Load More Reviews
              </button>
            ) : null}
          </>
        ) : (
          <div className="rounded-[22px] border border-dashed border-foreground/12 bg-white/3 p-7 text-center text-foreground/72">
            No reviews yet.
          </div>
        )}
      </section>
    </section>
  );
};

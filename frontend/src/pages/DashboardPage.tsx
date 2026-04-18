import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import { apiGet } from "../lib/api";

type RatingSummary = {
  id: number;
  musicId: number;
  score: number;
  title: string;
  artistName: string;
  albumTitle?: string;
  artworkUrl?: string;
};

type FollowingSummary = {
  id: string;
};

const cardClass =
  "rounded-[28px] border border-[rgba(244,239,231,0.12)] bg-[rgba(8,12,22,0.72)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-[20px]";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#ffbf69,#ff7b54)] px-[22px] py-[14px] font-bold text-[#1a1124] transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbf69] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220]";
const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[rgba(244,239,231,0.08)] px-[22px] py-[14px] font-bold text-[#f4efe7] transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbf69] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220]";

export const DashboardPage = () => {
  const user = useAuth().user;
  const [ratings, setRatings] = useState<RatingSummary[]>([]);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (!user) {
      return;
    }

    void apiGet<{ items: RatingSummary[] }>("/catalog/ratings")
      .then((payload) => {
        setRatings(payload.items);
      })
      .catch(() => {
        setRatings([]);
      });

    void apiGet<{ items: FollowingSummary[] }>("/social/following")
      .then((payload) => {
        setFollowingCount(payload.items.length);
      })
      .catch(() => {
        setFollowingCount(0);
      });
  }, [user]);

  if (!user) {
    return null;
  }

  const needsProfileSetup = !user.username || !user.bio || !user.avatarUrl;
  const primaryAction = needsProfileSetup ? "/app/profile" : "/app/search";
  const primaryLabel = needsProfileSetup
    ? "Finish Profile Setup"
    : "Search Catalog";
  const introCopy = needsProfileSetup
    ? "Finish your profile first so the app can show a complete identity, then jump into search."
    : "Your account is ready. Search the catalog, save what matters, and keep moving toward ratings.";

  return (
    <section className="mx-auto grid max-w-[1120px] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
      <article className={`${cardClass} p-10 md:p-10 lg:col-span-2`}>
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-[#ffbf69]">
          Private dashboard
        </p>
        <h1 className="m-0 text-[clamp(2rem,4vw,4.5rem)] leading-[0.98]">
          {user.displayName}, your workspace is ready.
        </h1>
        <p className="mt-5 max-w-[48rem] text-[1.05rem] leading-[1.7] text-[rgba(244,239,231,0.82)]">
          {introCopy}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link className={primaryButtonClass} to={primaryAction}>
            {primaryLabel}
          </Link>
          <Link className={ghostButtonClass} to="/app/people">
            Find People
          </Link>
          <Link
            className={ghostButtonClass}
            to={needsProfileSetup ? "/app/search" : "/app/profile"}
          >
            {needsProfileSetup ? "Browse First" : "Edit Profile"}
          </Link>
        </div>
      </article>

      <section className={`${cardClass} grid gap-5`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-[#ffbf69]">
              Recently rated
            </p>
            <h2 className="m-0 text-[clamp(1.6rem,2.4vw,2.4rem)] leading-[1.05]">
              Your latest scores
            </h2>
          </div>
          <Link className="font-semibold text-[#ffbf69]" to="/app/search">
            Rate more
          </Link>
        </div>
        {ratings.length ? (
          <div className="grid gap-3">
            {ratings.map((rating) => (
              <article
                className="grid gap-3 rounded-[18px] bg-[rgba(255,255,255,0.04)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                key={rating.id}
              >
                <div className="grid gap-1">
                  <strong>{rating.title}</strong>
                  <span className="text-[rgba(244,239,231,0.78)]">
                    {rating.artistName}
                    {rating.albumTitle ? ` · ${rating.albumTitle}` : ""}
                  </span>
                </div>
                <span className="w-fit rounded-full bg-[rgba(255,191,105,0.16)] px-3 py-2 text-sm font-semibold text-[#fff4df]">
                  {rating.score}/5
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="leading-[1.6] text-[rgba(244,239,231,0.82)]">
            Rate an imported track and it will land here.
          </p>
        )}
      </section>

      <aside className={cardClass}>
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-[#ffbf69]">
          Next actions
        </p>
        <dl className="mt-5 grid gap-[18px]">
          <div className="rounded-[18px] bg-[rgba(255,255,255,0.04)] p-4">
            <dt className="mb-2 text-sm text-[#ffbf69]">Search</dt>
            <dd className="m-0 leading-[1.6] text-[rgba(244,239,231,0.82)]">
              Look up songs and albums in the shared catalog.
            </dd>
          </div>
          <div className="rounded-[18px] bg-[rgba(255,255,255,0.04)] p-4">
            <dt className="mb-2 text-sm text-[#ffbf69]">Save</dt>
            <dd className="m-0 leading-[1.6] text-[rgba(244,239,231,0.82)]">
              Move selected results into your catalog when you want to keep
              them.
            </dd>
          </div>
          <div className="rounded-[18px] bg-[rgba(255,255,255,0.04)] p-4">
            <dt className="mb-2 text-sm text-[#ffbf69]">Profile status</dt>
            <dd className="m-0 leading-[1.6] text-[rgba(244,239,231,0.82)]">
              {needsProfileSetup
                ? "Complete your name, handle, avatar, and bio so your account feels finished."
                : user.username}
            </dd>
          </div>
          <div className="rounded-[18px] bg-[rgba(255,255,255,0.04)] p-4">
            <dt className="mb-2 text-sm text-[#ffbf69]">Taste signal</dt>
            <dd className="m-0 leading-[1.6] text-[rgba(244,239,231,0.82)]">
              {user.bio || "Tell us what you listen to."}
            </dd>
          </div>
          <div className="rounded-[18px] bg-[rgba(255,255,255,0.04)] p-4">
            <dt className="mb-2 text-sm text-[#ffbf69]">Following</dt>
            <dd className="m-0 leading-[1.6] text-[rgba(244,239,231,0.82)]">
              {followingCount
                ? `${followingCount} listener${followingCount === 1 ? "" : "s"}`
                : "Find listeners to follow."}
            </dd>
          </div>
        </dl>
      </aside>
    </section>
  );
};

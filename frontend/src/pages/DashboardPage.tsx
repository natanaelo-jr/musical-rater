import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
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

type FollowingSummary = {
  id: string;
};

type Recommendation = {
  musicId: number;
  title: string;
  artistName: string;
  albumTitle?: string;
  artworkUrl?: string;
  score: number;
  reason: string;
};

const cardClass =
  "rounded-[28px] border border-foreground/12 bg-panel p-8 shadow-panel backdrop-blur-[20px]";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full bg-primary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export const DashboardPage = () => {
  const { t } = useTranslation();
  const user = useAuth().user;
  const [ratings, setRatings] = useState<RatingSummary[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
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

    void apiGet<{ items: Recommendation[] }>("/catalog/recommendations")
      .then((payload) => {
        setRecommendations(payload.items);
      })
      .catch(() => {
        setRecommendations([]);
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
    ? t("finish_profile_setup")
    : t("search_catalog");
  const introCopy = needsProfileSetup
    ? t("intro_copy_incomplete")
    : t("intro_copy_ready");

  return (
    <section className="mx-auto grid max-w-[1120px] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
      <article className={`${cardClass} p-10 md:p-10 lg:col-span-2`}>
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
          {t("private_dashboard")}
        </p>
        <h1 className="m-0 text-[clamp(2rem,4vw,4.5rem)] leading-[0.98]">
          {t("dashboard_title", { name: user.displayName })}
        </h1>
        <p className="mt-5 max-w-[48rem] text-[1.05rem] leading-[1.7] text-foreground/82">
          {introCopy}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link className={primaryButtonClass} to={primaryAction}>
            {primaryLabel}
          </Link>
          <Link className={ghostButtonClass} to="/app/people">
            {t("find_people")}
          </Link>
          <Link
            className={ghostButtonClass}
            to={needsProfileSetup ? "/app/search" : "/app/profile"}
          >
            {needsProfileSetup ? t("browse_first") : t("edit_profile")}
          </Link>
        </div>
      </article>

      <section className={`${cardClass} grid gap-5 lg:col-span-2`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
              {t("recommendations")}
            </p>
            <h2 className="m-0 text-[clamp(1.6rem,2.4vw,2.4rem)] leading-[1.05]">
              {t("songs_to_try_next")}
            </h2>
          </div>
          <Link className="font-semibold text-primary" to="/app/search">
            {t("tune_your_taste")}
          </Link>
        </div>
        {recommendations.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {recommendations.map((item) => (
              <article
                className="grid min-h-[210px] content-start gap-4 rounded-[18px] bg-white/4 p-4"
                key={item.musicId}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-[64px] w-[64px] shrink-0 place-items-center overflow-hidden rounded-[16px] border border-foreground/10 bg-linear-to-br from-primary/22 via-white/5 to-secondary/24 text-center text-foreground">
                    {item.artworkUrl ? (
                      <img
                        alt={`${item.title} cover`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        src={item.artworkUrl}
                      />
                    ) : (
                      <span className="text-2xl font-bold">♪</span>
                    )}
                  </div>
                  <div className="grid min-w-0 gap-1">
                    <strong className="line-clamp-2 leading-tight">
                      {item.title}
                    </strong>
                    <span className="line-clamp-2 text-sm text-foreground/74">
                      {item.artistName}
                      {item.albumTitle ? ` · ${item.albumTitle}` : ""}
                    </span>
                  </div>
                </div>
                <p className="m-0 line-clamp-2 text-sm leading-[1.5] text-foreground/74">
                  {item.reason}
                </p>
                <span className="mt-auto w-fit rounded-full bg-secondary/16 px-3 py-2 text-sm font-semibold text-foreground">
                  {t("match_score", { score: Math.round(item.score) })}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="leading-[1.6] text-foreground/82">
            {t("recommendations_empty")}
          </p>
        )}
      </section>

      <section className={`${cardClass} grid gap-5`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
              {t("recently_rated")}
            </p>
            <h2 className="m-0 text-[clamp(1.6rem,2.4vw,2.4rem)] leading-[1.05]">
              {t("your_latest_scores")}
            </h2>
          </div>
          <Link className="font-semibold text-primary" to="/app/search">
            {t("rate_more")}
          </Link>
        </div>
        {ratings.length ? (
          <div className="grid gap-3">
            {ratings.map((rating) => (
              <article
                className="grid gap-3 rounded-[18px] bg-white/4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                key={rating.id}
              >
                <div className="grid gap-1">
                  <strong>{rating.title}</strong>
                  <span className="text-foreground/78">
                    {rating.artistName}
                    {rating.albumTitle ? ` · ${rating.albumTitle}` : ""}
                  </span>
                  {rating.review ? (
                    <p className="m-0 line-clamp-2 leading-[1.5] text-foreground/72">
                      {rating.review}
                    </p>
                  ) : null}
                </div>
                <span className="w-fit rounded-full bg-secondary/16 px-3 py-2 text-sm font-semibold text-foreground">
                  {rating.score}/5
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="leading-[1.6] text-foreground/82">
            {t("empty_recent_ratings")}
          </p>
        )}
      </section>

      <aside className={cardClass}>
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
          {t("next_actions")}
        </p>
        <dl className="mt-5 grid gap-[18px]">
          <div className="rounded-[18px] bg-white/4 p-4">
            <dt className="mb-2 text-sm text-primary">
              {t("action_search_title")}
            </dt>
            <dd className="m-0 leading-[1.6] text-foreground/82">
              {t("action_search_desc")}
            </dd>
          </div>
          <div className="rounded-[18px] bg-white/4 p-4">
            <dt className="mb-2 text-sm text-primary">
              {t("action_save_title")}
            </dt>
            <dd className="m-0 leading-[1.6] text-foreground/82">
              {t("action_save_desc")}
            </dd>
          </div>
          <div className="rounded-[18px] bg-white/4 p-4">
            <dt className="mb-2 text-sm text-primary">
              {t("action_profile_status_title")}
            </dt>
            <dd className="m-0 leading-[1.6] text-foreground/82">
              {needsProfileSetup
                ? t("action_profile_status_desc")
                : user.username}
            </dd>
          </div>
          <div className="rounded-[18px] bg-white/4 p-4">
            <dt className="mb-2 text-sm text-primary">
              {t("action_taste_title")}
            </dt>
            <dd className="m-0 leading-[1.6] text-foreground/82">
              {user.bio || t("action_taste_desc_empty")}
            </dd>
          </div>
          <div className="rounded-[18px] bg-white/4 p-4">
            <dt className="mb-2 text-sm text-primary">
              {t("action_following_title")}
            </dt>
            <dd className="m-0 leading-[1.6] text-foreground/82">
              {followingCount
                ? t("following_count", { count: followingCount })
                : t("action_following_desc")}
            </dd>
          </div>
        </dl>
      </aside>
    </section>
  );
};


import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

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

const cardClass =
  "rounded-[28px] border border-foreground/12 bg-panel p-8 shadow-panel backdrop-blur-[20px]";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full bg-primary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export const DashboardPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = auth;
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
    <main className="shell">
      <section className="dashboard-layout">
        <article className="card spotlight">
          <p className="eyebrow">{t("dashboard_eyebrow")}</p>
          {/* Aqui passamos o nome do usuário como variável para a tradução */}
          <h1>{t("dashboard_title", { name: user.displayName })}</h1>
          <p className="lede">{t("dashboard_lede")}</p>
          <div className="hero-actions">
            <Link className="primary-button button-link" to="/app/search">
              {t("search_catalog")}
            </Link>
            <Link className="primary-button button-link" to="/app/profile">
              {t("edit_profile")}
            </Link>
            <Link className="primary-button button-link" to="/app/people">
              {t("find_people")}
            </Link>
            <button
              className="ghost-button"
              onClick={() => {
                void auth
                  .logout()
                  .then(() => navigate("/login", { replace: true }));
              }}
              type="button"
            >
              {t("sign_out")}
            </button>
          </div>
        </article>

        {/* Seção Esquerda: Recently Rated */}
        <aside className="card profile-summary">
          <div className="flex justify-between items-center mb-4">
            <p className="eyebrow mb-0">{t("recently_rated_eyebrow")}</p>
            <Link to="/app/ratings" className="inline-link text-sm">
              {t("rate_more")}
            </Link>
          </div>
          <p className="lede">{t("latest_scores")}</p>
          <div className="mt-8 text-gray-500">
            <p>{t("empty_recent_ratings")}</p>
          </div>
        </aside>

        {/* Seção Direita: Next Actions */}
        <aside className="card profile-summary">
          <p className="eyebrow">{t("next_actions_eyebrow")}</p>
          <dl className="summary-grid">
            <div>
              <dt>{t("action_search_title")}</dt>
              <dd>{t("action_search_desc")}</dd>
            </div>
            <div>
              <dt>{t("action_import_title")}</dt>
              <dd>{t("action_import_desc")}</dd>
            </div>
            <div>
              <dt>{t("action_profile_title")}</dt>
              <dd>{user.username || t("action_profile_desc_empty")}</dd>
            </div>
            <div>
              <dt>{t("action_taste_title")}</dt>
              <dd>{user.bio || t("action_taste_desc_empty")}</dd>
            </div>
            <div>
              <dt>{t("action_following_title")}</dt>
              <dd>{t("action_following_desc")}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <aside className={cardClass}>
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
          Next actions
        </p>
        <dl className="mt-5 grid gap-[18px]">
          <div className="rounded-[18px] bg-white/4 p-4">
            <dt className="mb-2 text-sm text-primary">Search</dt>
            <dd className="m-0 leading-[1.6] text-foreground/82">
              Look up songs and albums in the shared catalog.
            </dd>
          </div>
          <div className="rounded-[18px] bg-white/4 p-4">
            <dt className="mb-2 text-sm text-primary">Save</dt>
            <dd className="m-0 leading-[1.6] text-foreground/82">
              Move selected results into your catalog when you want to keep
              them.
            </dd>
          </div>
          <div className="rounded-[18px] bg-white/4 p-4">
            <dt className="mb-2 text-sm text-primary">Profile status</dt>
            <dd className="m-0 leading-[1.6] text-foreground/82">
              {needsProfileSetup
                ? "Complete your name, handle, avatar, and bio so your account feels finished."
                : user.username}
            </dd>
          </div>
          <div className="rounded-[18px] bg-white/4 p-4">
            <dt className="mb-2 text-sm text-primary">Taste signal</dt>
            <dd className="m-0 leading-[1.6] text-foreground/82">
              {user.bio || "Tell us what you listen to."}
            </dd>
          </div>
          <div className="rounded-[18px] bg-white/4 p-4">
            <dt className="mb-2 text-sm text-primary">Following</dt>
            <dd className="m-0 leading-[1.6] text-foreground/82">
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

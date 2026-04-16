import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/useAuth";

export const DashboardPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = auth.user;

  if (!user) {
    return null;
  }

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
    </main>
  );
};

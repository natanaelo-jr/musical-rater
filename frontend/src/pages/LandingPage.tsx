import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const LandingPage = () => {
  const { t, i18n } = useTranslation();

  return (
    <main className="shell">
      {/* Botões de idioma na página inicial */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "16px",
          marginBottom: "40px",
        }}
      >
        <button
          onClick={() => i18n.changeLanguage("en")}
          className={
            i18n.resolvedLanguage === "en"
              ? "filter-chip active"
              : "filter-chip"
          }
        >
          English
        </button>
        <button
          onClick={() => i18n.changeLanguage("pt")}
          className={
            i18n.resolvedLanguage === "pt"
              ? "filter-chip active"
              : "filter-chip"
          }
        >
          Português
        </button>
      </div>

      <section className="hero-panel">
        <p className="eyebrow">Musical Rater</p>
        <h1>{t("hero_title")}</h1>
        <div className="hero-actions">
          <Link className="primary-button button-link" to="/register">
            {t("create_account", "Create account")}
          </Link>
          <Link className="ghost-button button-link" to="/login">
            {t("sign_in", "Sign in")}
          </Link>
        </div>
      </section>
    </main>
  );
};

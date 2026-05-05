import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "../components/LanguageSwitcher";

const panelClass =
  "mx-auto w-full max-w-[1120px] rounded-[36px] border border-foreground/12 bg-panel p-8 shadow-panel backdrop-blur-[20px] md:p-[72px]";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
const ghostButtonClass =
  "inline-flex items-center justify-center rounded-full bg-primary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export const LandingPage = () => {
  const { t } = useTranslation();

  return (
    <main className="grid min-h-screen items-center bg-auth-shell px-5 py-8 text-foreground sm:px-8">
      <section className={panelClass}>
        <div className="mb-8 flex justify-end">
          <LanguageSwitcher />
        </div>
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
          {t("app_name")}
        </p>
        <h1 className="m-0 text-[clamp(2rem,4vw,4.5rem)] leading-[0.98]">
          {t("landing_title")}
        </h1>
        <p className="mt-5 max-w-[48rem] text-[1.05rem] leading-[1.7] text-foreground/82">
          {t("landing_lede")}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link className={primaryButtonClass} to="/register">
            {t("create_account")}
          </Link>
          <Link className={ghostButtonClass} to="/login">
            {t("sign_in")}
          </Link>
        </div>
      </section>
    </main>
  );
};

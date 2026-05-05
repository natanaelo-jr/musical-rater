import type { FormEvent } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { toFieldErrors } from "../auth/authErrors";
import { useAuth } from "../auth/useAuth";
import { focusFirstFieldError } from "../components/formUtils";
import { Field } from "../components/forms";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

const shellClass =
  "grid min-h-screen items-center bg-auth-shell px-5 py-8 text-foreground sm:px-8";
const cardClass =
  "mx-auto w-full max-w-[640px] rounded-[28px] border border-foreground/12 bg-panel p-8 shadow-panel backdrop-blur-[20px]";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export const LoginPage = () => {
  const { t } = useTranslation();
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const nextPath =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/app";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});

    try {
      await auth.login({ email, password });
      navigate(nextPath, { replace: true });
    } catch (error) {
      const nextErrors = toFieldErrors(error);
      setErrors(nextErrors);
      focusFirstFieldError(nextErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={shellClass}>
      <section className={cardClass}>
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher />
        </div>
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
          {t("welcome_back")}
        </p>
        <h1 className="m-0 text-[clamp(2rem,3vw,3rem)] leading-[0.98]">
          {t("login_title")}
        </h1>
        <p className="mt-4 leading-[1.6] text-foreground/82">
          {t("login_lede")}
        </p>
        <form className="mt-7 grid gap-[18px]" onSubmit={submit}>
          <Field
            autoComplete="email"
            error={errors.email}
            helperText={t("login_email_help")}
            label={t("email_label")}
            name="email"
            onChange={setEmail}
            placeholder={t("email_placeholder")}
            spellCheck={false}
            type="email"
            value={email}
          />
          <Field
            autoComplete="current-password"
            error={errors.password}
            helperText={t("login_password_help")}
            label={t("password_label")}
            name="password"
            onChange={setPassword}
            type="password"
            value={password}
          />
          {errors.credentials || errors.form ? (
            <p aria-live="polite" className="text-danger">
              {errors.credentials ?? errors.form}
            </p>
          ) : null}
          <button
            className={primaryButtonClass}
            disabled={submitting}
            type="submit"
          >
            {submitting ? t("signing_in") : t("sign_in")}
          </button>
        </form>
        <p className="mt-4 leading-[1.6] text-foreground/82">
          {t("no_account")}{" "}
          <Link
            className="font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            to="/register"
          >
            {t("create_one")}
          </Link>
        </p>
      </section>
    </main>
  );
};

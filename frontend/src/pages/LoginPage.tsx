import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { toFieldErrors } from "../auth/authErrors";
import { useAuth } from "../auth/useAuth";
import { focusFirstFieldError } from "../components/formUtils";
import { Field } from "../components/forms";

const shellClass =
  "grid min-h-screen items-center bg-auth-shell px-5 py-8 text-foreground sm:px-8";
const cardClass =
  "mx-auto w-full max-w-[640px] rounded-[28px] border border-foreground/12 bg-panel p-8 shadow-panel backdrop-blur-[20px]";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

export const LoginPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

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
    <main className="shell">
      <section className="card auth-card">
        {/* Substituindo os textos fixos pelas chaves */}
        <p className="eyebrow">{t("login_eyebrow")}</p>
        <h1>{t("login_title")}</h1>
        <form className="stack" onSubmit={submit}>
          <Field
            autoComplete="email"
            error={errors.email}
            label={t("email_label")}
            onChange={setEmail}
            placeholder={t("email_placeholder")}
            type="email"
            value={email}
          />
          <Field
            autoComplete="current-password"
            error={errors.password}
            label={t("password_label")}
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
        <p className="support-copy">
          {t("no_account")}{" "}
          <Link className="inline-link" to="/register">
            {t("create_one")}
          </Link>
        </p>
      </section>
    </main>
  );
};

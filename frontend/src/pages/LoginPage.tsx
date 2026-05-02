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
<<<<<<< HEAD
    <main className="shell">
      <section className="card auth-card">
        {/* Substituindo os textos fixos pelas chaves */}
        <p className="eyebrow">{t("login_eyebrow")}</p>
        <h1>{t("login_title")}</h1>
        <form className="stack" onSubmit={submit}>
=======
    <main className={shellClass}>
      <section className={cardClass}>
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
          Welcome back
        </p>
        <h1 className="m-0 text-[clamp(2rem,3vw,3rem)] leading-[0.98]">
          Sign in and get back to your saved musical shortlist.
        </h1>
        <p className="mt-4 leading-[1.6] text-foreground/82">
          You&apos;ll return to your workspace, search flow, and profile setup.
        </p>
        <form className="mt-7 grid gap-[18px]" onSubmit={submit}>
>>>>>>> main
          <Field
            autoComplete="email"
            error={errors.email}
<<<<<<< HEAD
            label={t("email_label")}
            onChange={setEmail}
            placeholder={t("email_placeholder")}
=======
            helperText="Use the email address tied to your account."
            label="Email"
            name="email"
            onChange={setEmail}
            placeholder="you@example.com..."
            spellCheck={false}
>>>>>>> main
            type="email"
            value={email}
          />
          <Field
            autoComplete="current-password"
            error={errors.password}
<<<<<<< HEAD
            label={t("password_label")}
=======
            helperText="Use your existing password."
            label="Password"
            name="password"
>>>>>>> main
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
<<<<<<< HEAD
            {submitting ? t("signing_in") : t("sign_in")}
          </button>
        </form>
        <p className="support-copy">
          {t("no_account")}{" "}
          <Link className="inline-link" to="/register">
            {t("create_one")}
=======
            {submitting ? "Signing In..." : "Sign In"}
          </button>
        </form>
        <p className="mt-4 leading-[1.6] text-foreground/82">
          No account yet?{" "}
          <Link
            className="font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            to="/register"
          >
            Create one
>>>>>>> main
          </Link>
        </p>
      </section>
    </main>
  );
};

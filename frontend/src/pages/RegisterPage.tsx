import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // 1. Importando o hook

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

export const RegisterPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(); // 2. Inicializando a tradução

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});

    try {
      await auth.register({ displayName, email, password });
      navigate("/app", { replace: true });
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
        {/* 3. Substituindo os textos pelo t() */}
        <p className="eyebrow">{t("register_eyebrow")}</p>
        <h1>{t("register_title")}</h1>

        <form className="stack" onSubmit={submit}>
=======
    <main className={shellClass}>
      <section className={cardClass}>
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
          Create profile
        </p>
        <h1 className="m-0 text-[clamp(2rem,3vw,3rem)] leading-[0.98]">
          Create your account and start building your musical library.
        </h1>
        <p className="mt-4 leading-[1.6] text-foreground/82">
          After sign-up, your first step will be finding albums or tracks to
          save into your catalog.
        </p>
        <form className="mt-7 grid gap-[18px]" onSubmit={submit}>
>>>>>>> main
          <Field
            autoComplete="name"
            error={errors.display_name}
<<<<<<< HEAD
            label={t("display_name_label")}
            onChange={setDisplayName}
            placeholder={t("display_name_placeholder")}
=======
            helperText="Shown inside the app so your account feels recognizable."
            label="Display name"
            name="display_name"
            onChange={setDisplayName}
            placeholder="Broadway fan..."
>>>>>>> main
            value={displayName}
          />
          <Field
            autoComplete="email"
            error={errors.email}
<<<<<<< HEAD
            label={t("email_label")} // Reutilizando a chave da tela de Login!
            onChange={setEmail}
            placeholder={t("email_placeholder")}
=======
            helperText="Use a working email so you can sign back in later."
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
            autoComplete="new-password"
            error={errors.password}
<<<<<<< HEAD
            label={t("password_label")} // Reutilizando a chave da tela de Login!
            onChange={setPassword}
            placeholder={t("password_placeholder")}
            type="password"
            value={password}
          />
          {errors.form ? <p className="form-error">{errors.form}</p> : null}

=======
            helperText="Use at least 8 characters."
            label="Password"
            name="password"
            onChange={setPassword}
            placeholder="At least 8 characters..."
            type="password"
            value={password}
          />
          {errors.form ? (
            <p aria-live="polite" className="text-danger">
              {errors.form}
            </p>
          ) : null}
>>>>>>> main
          <button
            className={primaryButtonClass}
            disabled={submitting}
            type="submit"
          >
<<<<<<< HEAD
            {submitting ? t("creating_account") : t("create_account")}
          </button>
        </form>

        <p className="support-copy">
          {t("already_registered")}{" "}
          <Link className="inline-link" to="/login">
            {t("sign_in")} {/* Reutilizando a chave da tela inicial! */}
=======
            {submitting ? "Creating Account..." : "Create Account"}
          </button>
        </form>
        <p className="mt-4 leading-[1.6] text-foreground/82">
          Already registered?{" "}
          <Link
            className="font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            to="/login"
          >
            Sign In
>>>>>>> main
          </Link>
        </p>
      </section>
    </main>
  );
};

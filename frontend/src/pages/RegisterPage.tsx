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
    <main className="shell">
      <section className="card auth-card">
        {/* 3. Substituindo os textos pelo t() */}
        <p className="eyebrow">{t("register_eyebrow")}</p>
        <h1>{t("register_title")}</h1>

        <form className="stack" onSubmit={submit}>
          <Field
            autoComplete="name"
            error={errors.display_name}
            label={t("display_name_label")}
            onChange={setDisplayName}
            placeholder={t("display_name_placeholder")}
            value={displayName}
          />
          <Field
            autoComplete="email"
            error={errors.email}
            label={t("email_label")} // Reutilizando a chave da tela de Login!
            onChange={setEmail}
            placeholder={t("email_placeholder")}
            type="email"
            value={email}
          />
          <Field
            autoComplete="new-password"
            error={errors.password}
            label={t("password_label")} // Reutilizando a chave da tela de Login!
            onChange={setPassword}
            placeholder={t("password_placeholder")}
            type="password"
            value={password}
          />
          {errors.form ? <p className="form-error">{errors.form}</p> : null}

          <button
            className={primaryButtonClass}
            disabled={submitting}
            type="submit"
          >
            {submitting ? t("creating_account") : t("create_account")}
          </button>
        </form>

        <p className="support-copy">
          {t("already_registered")}{" "}
          <Link className="inline-link" to="/login">
            {t("sign_in")} {/* Reutilizando a chave da tela inicial! */}
          </Link>
        </p>
      </section>
    </main>
  );
};

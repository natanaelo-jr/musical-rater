import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // 1. Importando o hook

import { useAuth } from "../auth/useAuth";
import { toFieldErrors } from "../auth/authErrors";
import { Field } from "../components/forms";

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
      setErrors(toFieldErrors(error));
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
            error={errors.display_name}
            label={t("display_name_label")}
            onChange={setDisplayName}
            placeholder={t("display_name_placeholder")}
            value={displayName}
          />
          <Field
            error={errors.email}
            label={t("email_label")} // Reutilizando a chave da tela de Login!
            onChange={setEmail}
            placeholder={t("email_placeholder")}
            type="email"
            value={email}
          />
          <Field
            error={errors.password}
            label={t("password_label")} // Reutilizando a chave da tela de Login!
            onChange={setPassword}
            placeholder={t("password_placeholder")}
            type="password"
            value={password}
          />
          {errors.form ? <p className="form-error">{errors.form}</p> : null}

          <button
            className="primary-button"
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

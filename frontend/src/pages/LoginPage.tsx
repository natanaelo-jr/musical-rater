import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "../auth/useAuth";
import { toFieldErrors } from "../auth/authErrors";
import { Field } from "../components/forms";

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
      setErrors(toFieldErrors(error));
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
            error={errors.email}
            label={t("email_label")}
            onChange={setEmail}
            placeholder={t("email_placeholder")}
            type="email"
            value={email}
          />
          <Field
            error={errors.password}
            label={t("password_label")}
            onChange={setPassword}
            type="password"
            value={password}
          />
          {errors.credentials || errors.form ? (
            <p className="form-error">{errors.credentials ?? errors.form}</p>
          ) : null}
          <button
            className="primary-button"
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

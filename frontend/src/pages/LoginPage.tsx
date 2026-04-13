import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { toFieldErrors } from "../auth/authErrors";
import { useAuth } from "../auth/useAuth";
import { Field } from "../components/forms";

export const LoginPage = () => {
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
      setErrors(toFieldErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="shell">
      <section className="card auth-card">
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in to your private rating desk.</h1>
        <form className="stack" onSubmit={submit}>
          <Field
            error={errors.email}
            label="Email"
            onChange={setEmail}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
          <Field
            error={errors.password}
            label="Password"
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
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="support-copy">
          No account yet?{" "}
          <Link className="inline-link" to="/register">
            Create one
          </Link>
        </p>
      </section>
    </main>
  );
};

import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { toFieldErrors } from "../auth/authErrors";
import { Field } from "../components/forms";

export const RegisterPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
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
        <p className="eyebrow">Create profile</p>
        <h1>Start your account and unlock private pages.</h1>
        <form className="stack" onSubmit={submit}>
          <Field
            error={errors.display_name}
            label="Display name"
            onChange={setDisplayName}
            placeholder="Broadway fan"
            value={displayName}
          />
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
            placeholder="At least 8 characters"
            type="password"
            value={password}
          />
          {errors.form ? <p className="form-error">{errors.form}</p> : null}
          <button
            className="primary-button"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Creating..." : "Create account"}
          </button>
        </form>
        <p className="support-copy">
          Already registered?{" "}
          <Link className="inline-link" to="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
};

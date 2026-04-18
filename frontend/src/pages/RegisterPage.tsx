import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { toFieldErrors } from "../auth/authErrors";
import { useAuth } from "../auth/useAuth";
import { Field, focusFirstFieldError } from "../components/forms";

const shellClass =
  "grid min-h-screen items-center bg-auth-shell px-5 py-8 text-foreground sm:px-8";
const cardClass =
  "mx-auto w-full max-w-[640px] rounded-[28px] border border-foreground/12 bg-panel p-8 shadow-panel backdrop-blur-[20px]";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary px-[22px] py-[14px] font-bold text-white transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

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
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
          Create profile
        </p>
        <h1 className="m-0 text-[clamp(2rem,3vw,3rem)] leading-[0.98]">
          Create your account and start building your musical library.
        </h1>
        <p className="mt-4 leading-[1.6] text-foreground/82">
          After sign-up, your first step will be finding albums or tracks to save into your
          catalog.
        </p>
        <form className="mt-7 grid gap-[18px]" onSubmit={submit}>
          <Field
            autoComplete="name"
            error={errors.display_name}
            helperText="Shown inside the app so your account feels recognizable."
            label="Display name"
            name="display_name"
            onChange={setDisplayName}
            placeholder="Broadway fan..."
            value={displayName}
          />
          <Field
            autoComplete="email"
            error={errors.email}
            helperText="Use a working email so you can sign back in later."
            label="Email"
            name="email"
            onChange={setEmail}
            placeholder="you@example.com..."
            spellCheck={false}
            type="email"
            value={email}
          />
          <Field
            autoComplete="new-password"
            error={errors.password}
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
          <button className={primaryButtonClass} disabled={submitting} type="submit">
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
          </Link>
        </p>
      </section>
    </main>
  );
};

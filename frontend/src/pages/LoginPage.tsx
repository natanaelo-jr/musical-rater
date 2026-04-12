import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { toFieldErrors, useAuth } from "../auth/AuthContext";
import { Field, focusFirstFieldError } from "../components/forms";

const shellClass =
  "grid min-h-screen items-center bg-[radial-gradient(circle_at_top,rgba(255,184,77,0.2),transparent_30%),linear-gradient(160deg,#0d1321_0%,#151b2e_50%,#091018_100%)] px-5 py-8 text-[#f4efe7] sm:px-8";
const cardClass =
  "mx-auto w-full max-w-[640px] rounded-[28px] border border-[rgba(244,239,231,0.12)] bg-[rgba(8,12,22,0.72)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-[20px]";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#ffbf69,#ff7b54)] px-[22px] py-[14px] font-bold text-[#1a1124] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbf69] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1321]";

export const LoginPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const nextPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/app";

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
        <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-[#ffbf69]">
          Welcome back
        </p>
        <h1 className="m-0 text-[clamp(2rem,3vw,3rem)] leading-[0.98]">
          Sign in and get back to your saved musical shortlist.
        </h1>
        <p className="mt-4 leading-[1.6] text-[rgba(244,239,231,0.82)]">
          You&apos;ll return to your workspace, search flow, and profile setup.
        </p>
        <form className="mt-7 grid gap-[18px]" onSubmit={submit}>
          <Field
            autoComplete="email"
            error={errors.email}
            helperText="Use the email address tied to your account."
            label="Email"
            name="email"
            onChange={setEmail}
            placeholder="you@example.com..."
            spellCheck={false}
            type="email"
            value={email}
          />
          <Field
            autoComplete="current-password"
            error={errors.password}
            helperText="Use your existing password."
            label="Password"
            name="password"
            onChange={setPassword}
            type="password"
            value={password}
          />
          {errors.credentials || errors.form ? (
            <p aria-live="polite" className="text-[#ff8f8f]">
              {errors.credentials ?? errors.form}
            </p>
          ) : null}
          <button className={primaryButtonClass} disabled={submitting} type="submit">
            {submitting ? "Signing In..." : "Sign In"}
          </button>
        </form>
        <p className="mt-4 leading-[1.6] text-[rgba(244,239,231,0.82)]">
          No account yet?{" "}
          <Link
            className="font-semibold text-[#ffbf69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbf69] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1321]"
            to="/register"
          >
            Create one
          </Link>
        </p>
      </section>
    </main>
  );
};

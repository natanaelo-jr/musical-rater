import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { toFieldErrors } from "../auth/authErrors";
import { useAuth } from "../auth/useAuth";
import { Field, TextAreaField, focusFirstFieldError } from "../components/forms";

const cardClass =
  "mx-auto w-full max-w-[640px] rounded-[28px] border border-[rgba(244,239,231,0.12)] bg-[rgba(8,12,22,0.72)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-[20px]";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#ffbf69,#ff7b54)] px-[22px] py-[14px] font-bold text-[#1a1124] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbf69] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220]";

export const ProfilePage = () => {
  const auth = useAuth();
  const user = auth.user;
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setUsername(user?.username ?? "");
    setAvatarUrl(user?.avatarUrl ?? "");
    setBio(user?.bio ?? "");
  }, [user]);

  if (!user) {
    return null;
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setSuccess("");

    try {
      await auth.updateProfile({ displayName, username, avatarUrl, bio });
      setSuccess("Profile updated. Your workspace now reflects the new details.");
    } catch (error) {
      const nextErrors = toFieldErrors(error);
      setErrors(nextErrors);
      focusFirstFieldError(nextErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-[#ffbf69]">
            Edit profile
          </p>
          <h1 className="m-0 text-[clamp(2rem,3vw,3rem)] leading-[0.98]">
            Set the details that identify you in the app.
          </h1>
          <p className="mt-4 leading-[1.6] text-[rgba(244,239,231,0.82)]">
            Use a clear name, a recognizable handle, and a short bio so your account feels
            finished.
          </p>
        </div>
      </div>
      <form className="mt-7 grid gap-[18px]" onSubmit={submit}>
        <Field
          autoComplete="name"
          error={errors.display_name}
          helperText="Shown in the app and on future profile surfaces."
          label="Display name"
          name="display_name"
          onChange={setDisplayName}
          value={displayName}
        />
        <Field
          autoComplete="username"
          error={errors.username}
          helperText="Use the handle people will recognize when they browse your profile."
          label="Username"
          name="username"
          onChange={setUsername}
          placeholder="stage-door-fan..."
          spellCheck={false}
          value={username}
        />
        <Field
          autoComplete="url"
          error={errors.avatar_url}
          helperText="Paste a direct link to an image file."
          label="Avatar URL"
          name="avatar_url"
          onChange={setAvatarUrl}
          placeholder="https://example.com/avatar.jpg..."
          spellCheck={false}
          type="url"
          value={avatarUrl}
        />
        <TextAreaField
          autoComplete="off"
          error={errors.bio}
          helperText="Share what you like to rate, collect, or revisit."
          label="Bio"
          name="bio"
          onChange={setBio}
          placeholder="Share your favorite cast recordings..."
          value={bio}
        />
        {errors.form ? (
          <p aria-live="polite" className="text-[#ff8f8f]">
            {errors.form}
          </p>
        ) : null}
        {success ? (
          <p aria-live="polite" className="text-[#96f7c1]">
            {success}
          </p>
        ) : null}
        <button className={primaryButtonClass} disabled={submitting} type="submit">
          {submitting ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </section>
  );
};

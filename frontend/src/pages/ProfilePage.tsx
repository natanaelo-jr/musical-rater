import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/useAuth";
import { toFieldErrors } from "../auth/authErrors";
import { Field, TextAreaField } from "../components/forms";

export const ProfilePage = () => {
  const { t } = useTranslation();
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
      setSuccess("Profile updated.");
    } catch (error) {
      setErrors(toFieldErrors(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="shell">
      <section className="card profile-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">{t("profile_eyebrow")}</p>
            <h1>{t("profile_title")}</h1>
          </div>
          <Link className="ghost-button button-link" to="/app">
            {t("back_to_dashboard")}
          </Link>
        </div>
        <form className="stack" onSubmit={submit}>
          <Field
            error={errors.display_name}
            label={t("display_name_label")}
            onChange={setDisplayName}
            value={displayName}
          />
          <Field
            error={errors.username}
            label={t("username_label")}
            onChange={setUsername}
            placeholder="stage-door-fan"
            value={username}
          />
          <Field
            error={errors.avatar_url}
            label={t("avatar_url_label")}
            onChange={setAvatarUrl}
            placeholder="https://example.com/avatar.jpg"
            value={avatarUrl}
          />
          <TextAreaField
            error={errors.bio}
            label={t("bio_label")}
            onChange={setBio}
            placeholder={t("bio_placeholder")}
            value={bio}
          />
          {errors.form ? <p className="form-error">{errors.form}</p> : null}
          {success ? <p className="form-success">{success}</p> : null}
          <button
            className="primary-button"
            disabled={submitting}
            type="submit"
          >
            {submitting ? t("saving_profile") : t("save_profile")}
          </button>
        </form>
      </section>
    </main>
  );
};

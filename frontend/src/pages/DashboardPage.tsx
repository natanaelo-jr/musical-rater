import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export const DashboardPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const user = auth.user;

  if (!user) {
    return null;
  }

  return (
    <main className="shell">
      <section className="dashboard-layout">
        <article className="card spotlight">
          <p className="eyebrow">Private dashboard</p>
          <h1>{user.displayName}, your account is live.</h1>
          <p className="lede">
            This protected area confirms session auth is working and gives you a stable entry point
            for future recommendation, review, and collection features.
          </p>
          <div className="hero-actions">
            <Link className="primary-button button-link" to="/app/profile">
              Edit profile
            </Link>
            <button
              className="ghost-button"
              onClick={() => {
                void auth.logout().then(() => navigate("/login", { replace: true }));
              }}
              type="button"
            >
              Sign out
            </button>
          </div>
        </article>
        <aside className="card profile-summary">
          <p className="eyebrow">Account snapshot</p>
          <dl className="summary-grid">
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Username</dt>
              <dd>{user.username || "Not set yet"}</dd>
            </div>
            <div>
              <dt>Avatar</dt>
              <dd>{user.avatarUrl || "Not set yet"}</dd>
            </div>
            <div>
              <dt>Bio</dt>
              <dd>{user.bio || "Tell us what you listen to."}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
};

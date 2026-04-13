import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

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
            Start searching the shared catalog, import songs or albums into the
            local database, and build the foundation for ratings, favorites, and
            recommendations.
          </p>
          <div className="hero-actions">
            <Link className="primary-button button-link" to="/app/search">
              Search catalog
            </Link>
            <Link className="primary-button button-link" to="/app/profile">
              Edit profile
            </Link>
            <button
              className="ghost-button"
              onClick={() => {
                void auth
                  .logout()
                  .then(() => navigate("/login", { replace: true }));
              }}
              type="button"
            >
              Sign out
            </button>
          </div>
        </article>
        <aside className="card profile-summary">
          <p className="eyebrow">Next actions</p>
          <dl className="summary-grid">
            <div>
              <dt>Catalog search</dt>
              <dd>
                Look up songs and albums from MusicBrainz without leaving the
                app.
              </dd>
            </div>
            <div>
              <dt>Local import</dt>
              <dd>
                Save selected results to the local catalog when you are ready to
                use them.
              </dd>
            </div>
            <div>
              <dt>Profile</dt>
              <dd>
                {user.username ||
                  "Set your public identity before sharing reviews."}
              </dd>
            </div>
            <div>
              <dt>Taste signal</dt>
              <dd>{user.bio || "Tell us what you listen to."}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
};

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import { apiGet } from "../lib/api";

type RatingSummary = {
  id: number;
  musicId: number;
  score: number;
  title: string;
  artistName: string;
  albumTitle?: string;
  artworkUrl?: string;
};

type FollowingSummary = {
  id: string;
};

export const DashboardPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const user = auth.user;
  const [ratings, setRatings] = useState<RatingSummary[]>([]);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (!user) {
      return;
    }

    void apiGet<{ items: RatingSummary[] }>("/catalog/ratings")
      .then((payload) => {
        setRatings(payload.items);
      })
      .catch(() => {
        setRatings([]);
      });
    void apiGet<{ items: FollowingSummary[] }>("/social/following")
      .then((payload) => {
        setFollowingCount(payload.items.length);
      })
      .catch(() => {
        setFollowingCount(0);
      });
  }, [user]);

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
            <Link className="ghost-button button-link" to="/app/people">
              Find people
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
        <section className="card recent-ratings">
          <div className="section-header">
            <div>
              <p className="eyebrow">Recently rated</p>
              <h2>Your latest scores</h2>
            </div>
            <Link className="inline-link" to="/app/search">
              Rate more
            </Link>
          </div>
          {ratings.length ? (
            <div className="recent-rating-list">
              {ratings.map((rating) => (
                <article className="recent-rating-item" key={rating.id}>
                  <div>
                    <strong>{rating.title}</strong>
                    <span>
                      {rating.artistName}
                      {rating.albumTitle ? ` · ${rating.albumTitle}` : ""}
                    </span>
                  </div>
                  <span className="rating-badge">{rating.score}/5</span>
                </article>
              ))}
            </div>
          ) : (
            <p className="support-copy">
              Rate an imported track and it will land here.
            </p>
          )}
        </section>
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
            <div>
              <dt>Following</dt>
              <dd>
                {followingCount
                  ? `${followingCount} listener${followingCount === 1 ? "" : "s"}`
                  : "Find listeners to follow."}
              </dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
};

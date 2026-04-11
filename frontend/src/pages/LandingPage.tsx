import { Link } from "react-router-dom";

export const LandingPage = () => (
  <main className="shell">
    <section className="hero-panel">
      <p className="eyebrow">Musical Rater</p>
      <h1>Rate cast albums, track favorites, and shape a profile that feels like yours.</h1>
      <p className="lede">
        This first release sets the identity layer for the platform: account creation, private
        space, and a profile ready for future recommendation features.
      </p>
      <div className="hero-actions">
        <Link className="primary-button button-link" to="/register">
          Create account
        </Link>
        <Link className="ghost-button button-link" to="/login">
          Sign in
        </Link>
      </div>
    </section>
  </main>
);

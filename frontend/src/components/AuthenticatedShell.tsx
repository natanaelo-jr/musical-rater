import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

const getInitials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "MR";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "inline-flex min-h-[42px] items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbf69] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220]",
    isActive
      ? "border-[rgba(255,191,105,0.46)] bg-[linear-gradient(135deg,rgba(255,191,105,0.22),rgba(255,123,84,0.24))] text-[#fff4df]"
      : "border-[rgba(244,239,231,0.12)] bg-[rgba(244,239,231,0.05)] text-[#f4efe7] hover:-translate-y-px",
  ].join(" ");

export const AuthenticatedShell = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const user = auth.user;

  if (!user) {
    return null;
  }

  const needsProfileSetup = !user.username || !user.bio || !user.avatarUrl;

  const handleLogout = async () => {
    await auth.logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,191,105,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,123,84,0.13),transparent_30%),linear-gradient(160deg,#0b1220_0%,#121a2d_46%,#08111a_100%)] px-5 py-5 text-[#f4efe7] sm:px-6">
      <div className="mx-auto max-w-[1240px]">
        <a
          className="absolute left-5 top-4 z-30 -translate-y-[180%] rounded-full bg-[#ffbf69] px-4 py-3 font-bold text-[#1a1124] transition focus:translate-y-0 focus:shadow-[0_16px_36px_rgba(0,0,0,0.26)] focus:outline-none"
          href="#app-main"
        >
          Skip to app content
        </a>

        <header className="flex flex-wrap items-center justify-between gap-[18px] rounded-3xl border border-[rgba(244,239,231,0.12)] bg-[rgba(9,14,24,0.72)] px-[22px] py-[18px] shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-[18px]">
          <div className="grid gap-1">
            <p className="m-0 text-[0.72rem] uppercase tracking-[0.16em] text-[#ffbf69]">
              Private workspace
            </p>
            <div className="flex items-center gap-2.5 text-[1.02rem] font-bold tracking-[0.02em]">
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full bg-[linear-gradient(135deg,#ffbf69,#ff7b54)] shadow-[0_0_0_6px_rgba(255,191,105,0.12)]"
              />
              <Link className="text-inherit no-underline" to="/app">
                Musical Rater
              </Link>
            </div>
          </div>

          <nav aria-label="Primary" className="flex flex-wrap items-center gap-2.5">
            {[
              { label: "Dashboard", to: "/app" },
              { label: "Search", to: "/app/search" },
              { label: "Profile", to: "/app/profile" },
            ].map((item) => (
              <NavLink className={navLinkClass} end={item.to === "/app"} key={item.to} to={item.to}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            <div
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-[14px] border border-[rgba(255,191,105,0.2)] bg-[linear-gradient(135deg,rgba(255,191,105,0.24),rgba(255,123,84,0.22))] font-bold text-[#fff4df]"
            >
              {getInitials(user.displayName || user.username || user.email)}
            </div>
            <div className="grid min-w-0 gap-0.5">
              <div className="font-bold leading-tight">{user.displayName || "Your profile"}</div>
              <div className="text-sm text-[rgba(244,239,231,0.7)]">
                {user.username ? `@${user.username}` : user.email}
              </div>
            </div>
            <button
              className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-[rgba(244,239,231,0.08)] px-[22px] py-[14px] font-bold text-[#f4efe7] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbf69] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1220]"
              onClick={() => void handleLogout()}
              type="button"
            >
              Sign out
            </button>
          </div>
        </header>

        {needsProfileSetup ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[rgba(255,191,105,0.18)] bg-[rgba(255,191,105,0.08)] px-4 py-[14px] text-[#fff4df]">
            <span>
              Finish your profile so friends and future ratings have a clearer identity to follow.
            </span>
            <Link className="font-bold text-[#ffbf69]" to="/app/profile">
              Complete profile
            </Link>
          </div>
        ) : null}

        <div className="pt-5 outline-none" id="app-main" tabIndex={-1}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

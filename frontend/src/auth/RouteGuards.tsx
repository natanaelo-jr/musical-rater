import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./AuthContext";

const LoadingScreen = () => (
  <main className="grid min-h-screen items-center bg-[radial-gradient(circle_at_top,rgba(255,184,77,0.2),transparent_30%),linear-gradient(160deg,#0d1321_0%,#151b2e_50%,#091018_100%)] px-5 py-8 text-[#f4efe7] sm:px-8" aria-busy="true" aria-live="polite">
    <section
      className="mx-auto w-full max-w-[640px] rounded-[28px] border border-[rgba(244,239,231,0.12)] bg-[rgba(8,12,22,0.72)] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-[20px]"
      role="status"
    >
      <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-[#ffbf69]">
        Loading workspace
      </p>
      <h1 className="m-0 text-[clamp(2rem,3vw,3rem)] leading-[0.98]">Checking your account...</h1>
      <p className="mt-4 leading-[1.6] text-[rgba(244,239,231,0.82)]">
        You&apos;ll land back in your workspace in a moment.
      </p>
    </section>
  </main>
);

export const ProtectedRoute = () => {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") {
    return <LoadingScreen />;
  }

  if (auth.status === "anonymous") {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Outlet />;
};

export const PublicOnlyRoute = () => {
  const auth = useAuth();

  if (auth.status === "loading") {
    return <LoadingScreen />;
  }

  if (auth.status === "authenticated") {
    return <Navigate replace to="/app" />;
  }

  return <Outlet />;
};

import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./useAuth";

const LoadingScreen = () => (
  <main className="grid min-h-screen items-center bg-auth-shell px-5 py-8 text-foreground sm:px-8" aria-busy="true" aria-live="polite">
    <section
      className="mx-auto w-full max-w-[640px] rounded-[28px] border border-foreground/12 bg-panel p-8 text-center shadow-panel backdrop-blur-[20px]"
      role="status"
    >
      <p className="mb-3 text-[0.76rem] uppercase tracking-[0.18em] text-secondary">
        Loading workspace
      </p>
      <h1 className="m-0 text-[clamp(2rem,3vw,3rem)] leading-[0.98]">Checking your account...</h1>
      <p className="mt-4 leading-[1.6] text-foreground/82">
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

import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./AuthContext";

const LoadingScreen = () => (
  <main className="shell loading-shell">
    <section className="card loading-card">
      <p className="eyebrow">Bootstrapping session</p>
      <h1>Checking your access.</h1>
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

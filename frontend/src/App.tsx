import { Navigate, Route, Routes } from "react-router-dom";

import "./App.css";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./auth/RouteGuards";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";

const App = () => (
  <AuthProvider>
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route element={<LandingPage />} path="/" />
        <Route element={<LoginPage />} path="/login" />
        <Route element={<RegisterPage />} path="/register" />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardPage />} path="/app" />
        <Route element={<ProfilePage />} path="/app/profile" />
      </Route>
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  </AuthProvider>
);

export default App;

import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthProvider";
import {
  ProtectedRoute,
  PublicOnlyRoute,
  StaffRoute,
} from "./auth/RouteGuards";
import { AuthenticatedShell } from "./components/AuthenticatedShell";
import { AdminPage } from "./pages/AdminPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FeedPage } from "./pages/FeedPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { PeoplePage } from "./pages/PeoplePage";
import { ProfilePage } from "./pages/ProfilePage";
import { PublicProfilePage } from "./pages/PublicProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { SearchPage } from "./pages/SearchPage";
import { SongPage } from "./pages/SongPage";

const App = () => (
  <AuthProvider>
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route element={<LandingPage />} path="/" />
        <Route element={<LoginPage />} path="/login" />
        <Route element={<RegisterPage />} path="/register" />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedShell />} path="/app">
          <Route element={<DashboardPage />} index />
          <Route element={<FeedPage />} path="feed" />
          <Route element={<PeoplePage />} path="people" />
          <Route element={<PublicProfilePage />} path="people/:userId" />
          <Route element={<NotificationsPage />} path="notifications" />
          <Route element={<SearchPage />} path="search" />
          <Route element={<SongPage />} path="songs/:songId" />
          <Route element={<ProfilePage />} path="profile" />
          <Route element={<StaffRoute />}>
            <Route element={<AdminPage />} path="admin" />
          </Route>
        </Route>
      </Route>
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  </AuthProvider>
);

export default App;

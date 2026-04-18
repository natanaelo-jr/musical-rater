import {
  type PropsWithChildren,
  startTransition,
  useCallback,
  useEffect,
  useState,
} from "react";

import { AuthContext } from "./AuthContext";
import type { AuthState, User } from "./AuthContext";
import { apiGet, apiRequest, ensureCsrfToken } from "../lib/api";

type AuthResponse = {
  authenticated: boolean;
  user: User | null;
};

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
};

type ProfileInput = {
  displayName: string;
  username: string;
  avatarUrl: string;
  bio: string;
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [status, setStatus] = useState<AuthState>("loading");
  const [user, setUser] = useState<User | null>(null);

  const applyAuth = useCallback((payload: AuthResponse) => {
    startTransition(() => {
      if (payload.authenticated && payload.user) {
        setUser(payload.user);
        setStatus("authenticated");
        return;
      }

      setUser(null);
      setStatus("anonymous");
    });
  }, []);

  const refresh = useCallback(async () => {
    await ensureCsrfToken();
    const payload = await apiGet<AuthResponse>("/auth/me");
    applyAuth(payload);
  }, [applyAuth]);

  useEffect(() => {
    void refresh().catch(() => {
      setUser(null);
      setStatus("anonymous");
    });
  }, [refresh]);

  const login = async (input: LoginInput) => {
    const payload = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        password: input.password,
      }),
    });
    applyAuth(payload);
    return payload.user as User;
  };

  const register = async (input: RegisterInput) => {
    const payload = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        display_name: input.displayName,
      }),
    });
    applyAuth(payload);
    return payload.user as User;
  };

  const logout = async () => {
    await apiRequest("/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    });
    applyAuth({ authenticated: false, user: null });
  };

  const updateProfile = async (input: ProfileInput) => {
    const payload = await apiRequest<{ user: User }>("/profile/me", {
      method: "PATCH",
      body: JSON.stringify({
        display_name: input.displayName,
        username: input.username,
        avatar_url: input.avatarUrl,
        bio: input.bio,
      }),
    });

    setUser(payload.user);
    setStatus("authenticated");
    return payload.user;
  };

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        refresh,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

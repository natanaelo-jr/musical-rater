import {
  type PropsWithChildren,
  startTransition,
  useEffect,
  useState,
} from "react";

export type User = {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  bio: string;
};

import { AuthContext } from "./AuthContext";
import { apiGet, ensureCsrfToken } from "../lib/api";

type AuthState = "loading" | "authenticated" | "anonymous";

type AuthResponse = {
  authenticated: boolean;
  user: User | null;
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [status, setStatus] = useState<AuthState>("loading");
  const [user, setUser] = useState<User | null>(null);

  const applyAuth = (payload: AuthResponse) => {
    startTransition(() => {
      if (payload.authenticated && payload.user) {
        setUser(payload.user);
        setStatus("authenticated");
        return;
      }

      setUser(null);
      setStatus("anonymous");
    });
  };

  const refresh = async () => {
    await ensureCsrfToken();
    const payload = await apiGet<AuthResponse>("/auth/me");
    applyAuth(payload);
  };

  useEffect(() => {
    void refresh().catch(() => {
      setUser(null);
      setStatus("anonymous");
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        refresh,
        login: async () => {
          throw new Error("not implemented here");
        },
        register: async () => {
          throw new Error("not implemented here");
        },
        logout: async () => {},
        updateProfile: async () => {
          throw new Error("not implemented here");
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

import {
  createContext,
  type PropsWithChildren,
  startTransition,
  useContext,
  useEffect,
  useState,
} from "react";

import { ApiError, apiGet, apiRequest, ensureCsrfToken } from "../lib/api";

export type User = {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  bio: string;
};

type AuthState = "loading" | "authenticated" | "anonymous";

type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type ProfileInput = {
  displayName: string;
  username: string;
  avatarUrl: string;
  bio: string;
};

type FieldErrors = Record<string, string>;

type AuthContextValue = {
  status: AuthState;
  user: User | null;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<User>;
};

type AuthResponse = {
  authenticated: boolean;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const readErrors = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return { form: "Unexpected error. Please try again." };
  }

  const payloadErrors = error.payload?.errors;
  if (payloadErrors && typeof payloadErrors === "object") {
    return payloadErrors as FieldErrors;
  }

  return { form: error.message };
};

export const toFieldErrors = readErrors;

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

    const nextUser = payload.user;
    setUser(nextUser);
    setStatus("authenticated");
    return nextUser;
  };

  return (
    <AuthContext.Provider
      value={{ status, user, login, register, logout, refresh: () => refresh(), updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
};

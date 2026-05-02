import { createContext } from "react";

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

export type User = {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  bio: string;
};

export type AuthState = "loading" | "authenticated" | "anonymous";

export type AuthContextValue = {
  status: AuthState;
  user: User | null;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (input: ProfileInput) => Promise<User>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ReactNode } from "react";

import { loginRequest } from "../lib/api";
import type { AppRole } from "../types/roles";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: AppRole;
}

interface LoginPayload {
  email: string;
  password: string;
  role: AppRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = "mameron-auth-user";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const savedUser = window.sessionStorage.getItem(STORAGE_KEY);

    if (savedUser) {
      setUser(JSON.parse(savedUser) as AuthUser);
    }

    // Clear legacy persistent auth so old sessions do not bypass login.
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: async (payload) => {
        const nextUser = await loginRequest(payload);
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        window.localStorage.removeItem(STORAGE_KEY);
        setUser(nextUser);
      },
      logout: () => {
        window.sessionStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export { AuthProvider, useAuth };

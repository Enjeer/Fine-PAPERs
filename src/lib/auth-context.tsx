import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { api } from "./axios";

interface User {
  id: string;
  email: string;
  user_name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loginWithGoogle: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = "ab_user";
const TOKEN_KEY = "access_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (login: string, password: string) => {
    try {
      const response = await api.post("login/", { login, password });
      const data = response.data;

      const userToSave: User = {
        id: data.user_id || "",
        email: data.email || "",
        user_name: data.user_name || login,
      };

      localStorage.setItem(TOKEN_KEY, data.access);
      localStorage.setItem(USER_KEY, JSON.stringify(userToSave));
      setUser(userToSave);
    } catch (error: any) {
      const errorData = error.response?.data;
      let finalError = "Ошибка сети или CORS";

      if (errorData) {
        if (typeof errorData === "string") finalError = errorData;
        else if (errorData.non_field_errors)
          finalError = errorData.non_field_errors[0];
        else if (errorData.detail) finalError = errorData.detail;
      } else if (error.message) {
        finalError = error.message;
      }

      console.error("Auth error:", finalError);
      throw finalError;
    }
  }, []);

  const signUp = useCallback(
    async (user_name: string, email: string, password: string) => {
      try {
        const response = await api.post("register/", {
          user_name,
          email,
          password,
        });
        const data = response.data;

        const userToSave: User = {
          id: data.user_id || "",
          email: data.email || email,
          user_name: data.user_name || user_name,
        };

        localStorage.setItem(TOKEN_KEY, data.access);
        localStorage.setItem(USER_KEY, JSON.stringify(userToSave));
        setUser(userToSave);
      } catch (error: any) {
        throw error.response?.data?.detail || "Ошибка регистрации";
      }
    },
    [],
  );

  const loginWithGoogle = useCallback(() => {
    if (!window.google?.accounts?.oauth2) {
      console.error("Google Identity Services SDK не загружен");
      return;
    }

    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      ux_mode: "popup",
      callback: async (response: any) => {
        if (response.error) {
          console.error("Google auth error:", response.error);
          return;
        }

        try {
          const res = await api.post("google_auth/", { code: response.code });
          const data = res.data;

          const userToSave: User = {
            id: data.user_id || "",
            email: data.email || "",
            user_name: data.user_name || "",
          };

          localStorage.setItem(TOKEN_KEY, data.access);
          localStorage.setItem(USER_KEY, JSON.stringify(userToSave));
          setUser(userToSave);
        } catch (error: any) {
          console.error(
            "Google auth backend error:",
            error.response?.data?.detail || error.message,
          );
        }
      },
    });

    client.requestCode();
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("logout/");
    } catch (error) {
      console.error("Server logout failed:", error);
    } finally {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, signUp, logout, loginWithGoogle }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import { api } from "./axios";
import { GOOGLE_CLIENT_ID } from "@/config";
import { setAccessToken, clearAccessToken } from "./token-store";
interface User {
  id: string;
  email: string;
  user_name: string;
}

interface AuthResponse {
  access: string;
  id?: string;
  user_id?: string;
  user_name?: string;
  email?: string;
  user?: Partial<User>;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  sessionError: string;
  restoreSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loginWithGoogle: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function authErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data;
    if (typeof data === "string") return data;
    if (typeof data === "object" && data !== null) {
      const details = data as Record<string, unknown>;
      const errorDetails = details.errors;
      const nestedDetails =
        typeof errorDetails === "object" && errorDetails !== null
          ? (errorDetails as Record<string, unknown>)
          : details;
      const nonFieldErrors = nestedDetails.non_field_errors;
      if (Array.isArray(nonFieldErrors)) {
        const message = nonFieldErrors.find(
          (item): item is string => typeof item === "string",
        );
        if (message) return message;
      }
      if (typeof nestedDetails.detail === "string") {
        return nestedDetails.detail;
      }
    }
  }
  return error instanceof Error ? error.message : fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");

  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    setSessionError("");
    try {
      const { data: tokenData } = await api.post<{ access: string }>(
        "token/refresh/",
      );
      setAccessToken(tokenData.access);
      const { data: profile } = await api.get<User>("me/");
      setUser(profile);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === undefined || status >= 500) {
        setSessionError("Не удалось загрузить профиль. Проверьте соединение и повторите попытку.");
      } else {
        clearAccessToken();
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (login: string, password: string) => {
    setSessionError("");
    try {
      const response = await api.post<AuthResponse>("login/", {
        login,
        password,
      });
      const data = response.data;
      setAccessToken(data.access);
      const profile = await api.get<User>("me/");
      setUser(profile.data);
    } catch (error: unknown) {
      clearAccessToken();
      setUser(null);
      const finalError = authErrorMessage(error, "Ошибка сети или CORS");
      console.error("Auth error:", finalError);
      throw finalError;
    }
  }, []);

  const signUp = useCallback(
    async (user_name: string, email: string, password: string) => {
      setSessionError("");
      try {
        const response = await api.post<AuthResponse>("register/", {
          user_name,
          email,
          password,
        });
        const data = response.data;
        setAccessToken(data.access);
        const profile = await api.get<User>("me/");
        setUser(profile.data);
      } catch (error: unknown) {
        clearAccessToken();
        setUser(null);
        throw authErrorMessage(error, "Ошибка регистрации");
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
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      ux_mode: "popup",
      callback: async (response) => {
        if (response.error) {
          console.error("Google auth error:", response.error);
          return;
        }

        try {
          const res = await api.post<AuthResponse>("google_auth/", {
            code: response.code,
          });
          const data = res.data;
          setAccessToken(data.access);
          const profile = await api.get<User>("me/");
          setUser(profile.data);
        } catch (error: unknown) {
          clearAccessToken();
          setUser(null);
          console.error(
            "Google auth backend error:",
            authErrorMessage(error, "Ошибка входа через Google"),
          );
        }
      },
    });

    client.requestCode();
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setUser(null);
    setSessionError("");

    try {
      await api.post("logout/");
    } catch (error) {
      console.error("Server logout failed:", error);
    } finally {
      clearAccessToken();
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        sessionError,
        restoreSession,
        login,
        signUp,
        logout,
        loginWithGoogle,
      }}
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

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const USER_KEY = "ab_user";
  const TOKEN_KEY = "access_token";

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (login: string, password: string) => {
    try {
      const response = await api.post('login/', { login, password });
      const data = response.data;

      const userToSave: User = {
        id: data.user_id || "", 
        email: data.email || "",
        user_name: data.user_name || login
      };

      // const userToSave: User = {
      //   id: '123123123',
      //   email: 'wallesalex205@gmail.com',
      //   user_name: "Enjeer"
      // }    

      localStorage.setItem(TOKEN_KEY, data.access);
      // localStorage.setItem(TOKEN_KEY, "1231232131");
      localStorage.setItem(USER_KEY, JSON.stringify(userToSave));
      
      setUser(userToSave);

    } catch (error: any) {
      const errorData = error.response?.data;
      let finalError = "Ошибка сети или CORS";

      if (errorData) {
        if (typeof errorData === 'string') finalError = errorData;
        else if (errorData.non_field_errors) finalError = errorData.non_field_errors[0];
        else if (errorData.detail) finalError = errorData.detail;
      } else if (error.message) {
        finalError = error.message;
      }

      console.error("Auth error:", finalError);
      throw finalError;
    }
  }, []);

  const signUp = useCallback(async (user_name: string, email: string, password: string) => {
    try {
      const response = await api.post('register/', { user_name, email, password });
      const data = response.data;

      const userToSave: User = {
        id: data.user_id || "",
        email: data.email || email,  
        user_name: data.user_name || user_name
      };

      localStorage.setItem(TOKEN_KEY, data.access);
      localStorage.setItem(USER_KEY, JSON.stringify(userToSave));
      
      setUser(userToSave);

    } catch (error: any) {
      throw error.response?.data?.detail || "Ошибка регистрации";
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('logout/')
    } catch (error) {
      console.error("Server logout failed:", error);
    } finally {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, [api]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
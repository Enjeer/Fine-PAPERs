import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  adminApiErrorMessage,
  getAdminSession,
  loginAdmin,
  logoutAdmin,
} from "./admin-auth-api";

type AdminAuthContextValue = {
  username: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  restoreError: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreError, setRestoreError] = useState("");

  const restore = useCallback(async () => {
    setIsLoading(true);
    setRestoreError("");
    try {
      const session = await getAdminSession();
      setUsername(session.username);
    } catch (error) {
      setUsername(null);
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        (error as { response?: { status?: number } }).response?.status !== 401
      ) {
        setRestoreError("Не удалось проверить административную сессию.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setUsername(null);
      setRestoreError("");
    };
    window.addEventListener("platform-admin-session-expired", onExpired);
    void restore();
    return () =>
      window.removeEventListener("platform-admin-session-expired", onExpired);
  }, [restore]);

  const login = useCallback(async (loginName: string, password: string) => {
    try {
      const session = await loginAdmin(loginName, password);
      setUsername(session.username);
      setRestoreError("");
    } catch (error) {
      setUsername(null);
      throw adminApiErrorMessage(error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutAdmin();
    } finally {
      setUsername(null);
      setRestoreError("");
    }
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        username,
        isAuthenticated: username !== null,
        isLoading,
        restoreError,
        login,
        logout,
        restore,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}

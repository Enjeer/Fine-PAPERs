import { useCallback } from "react";
import { useAuth } from "@/lib/auth-context";

export function useGoogleAuth() {
  const { loginWithGoogle } = useAuth();

  const signInWithGoogle = useCallback(() => {
    loginWithGoogle();
  }, [loginWithGoogle]);

  return { signInWithGoogle };
}

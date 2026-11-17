import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

function AuthFallbackPage() {
  return <div className="h-screen w-screen bg-background" aria-live="polite" />;
}

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <AuthFallbackPage />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

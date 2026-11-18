import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/lib/admin-auth-context";

export default function AdminProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, restoreError, restore } = useAdminAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        className="grid min-h-screen place-items-center bg-background"
        aria-live="polite"
      >
        Проверяем административную сессию…
      </div>
    );
  }
  if (restoreError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="space-y-4 text-center" role="alert">
          <p>{restoreError}</p>
          <Button onClick={() => void restore()}>Повторить</Button>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }
  return <>{children}</>;
}

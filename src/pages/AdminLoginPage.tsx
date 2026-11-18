import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/lib/admin-auth-context";

type LocationState = { from?: string };

export default function AdminLoginPage() {
  const { login, isAuthenticated, isLoading, restoreError, restore } =
    useAdminAuth();
  const location = useLocation();
  const redirectTo = (location.state as LocationState | null)?.from ?? "/admin/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center" aria-live="polite">
        Проверяем административную сессию…
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (loginError) {
      setError(
        typeof loginError === "string"
          ? loginError
          : "Не удалось выполнить вход.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4">
      <section className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Вход администратора</h1>
          <p className="text-sm text-muted-foreground">
            Введите отдельные учётные данные административной панели.
          </p>
        </header>
        {restoreError && (
          <div className="space-y-2 text-sm text-destructive" role="alert">
            <p>{restoreError}</p>
            <Button type="button" variant="outline" onClick={() => void restore()}>
              Повторить проверку
            </Button>
          </div>
        )}
        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="admin-username">Имя администратора</Label>
            <Input
              id="admin-username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Пароль</Label>
            <Input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Входим…" : "Войти"}
          </Button>
        </form>
      </section>
    </main>
  );
}

import { useQuery } from "@tanstack/react-query";
import { NavLink, Outlet, Link } from "react-router-dom";
import { ArrowLeft, Headset, LayoutDashboard, Shield, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/lib/admin-auth-context";
import { getAdminProfile, type AdminProfile } from "@/lib/admin-api";

const sectionIcons = {
  dashboard: LayoutDashboard,
  role_management: Shield,
  support: Headset,
} as const;

function LoadingPanel() {
  return (
    <div className="grid min-h-screen place-items-center bg-background text-muted-foreground" aria-live="polite">
      Проверяем административные права…
    </div>
  );
}

function AdminLoadError({ error, retry }: { error: unknown; retry: () => void }) {
  const status =
    typeof error === "object" && error !== null && "response" in error
      ? (error as { response?: { status?: number } }).response?.status
      : undefined;

  if (status === 403) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <section className="max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold">Нет административных прав</h1>
          <p className="text-sm text-muted-foreground">
            Эта учётная запись не назначена ни на одну доступную административную роль.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Вернуться в FinePapers</Link>
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <section className="max-w-md space-y-4 text-center" role="alert">
        <h1 className="text-xl font-semibold">Не удалось загрузить права</h1>
        <p className="text-sm text-muted-foreground">
          Сервер не подтвердил административный профиль. Попробуйте ещё раз.
        </p>
        <Button onClick={retry}>Повторить</Button>
      </section>
    </div>
  );
}

export default function AdminLayout() {
  const { logout } = useAdminAuth();
  const profileQuery = useQuery({
    queryKey: ["admin-profile"],
    queryFn: getAdminProfile,
    retry: false,
    refetchOnMount: "always",
  });

  if (profileQuery.isLoading || !profileQuery.data && !profileQuery.error) {
    return <LoadingPanel />;
  }
  if (profileQuery.error || !profileQuery.data) {
    return (
      <AdminLoadError
        error={profileQuery.error}
        retry={() => void profileQuery.refetch()}
      />
    );
  }

  const profile: AdminProfile = profileQuery.data;
  const roleLabels = profile.roles.join(", ");

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar md:flex md:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
          <div>
            <p className="font-display font-bold">FinePapers</p>
            <p className="text-xs text-muted-foreground">Администрирование</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Административная навигация">
          {profile.sections.map((section) => {
            const Icon = sectionIcons[section.key];
            return (
              <NavLink
                key={section.key}
                to={section.path}
                end={section.key === "dashboard"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {section.label}
              </NavLink>
            );
          })}
          {profile.sections.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Разделы для этой роли пока не подключены.
            </p>
          )}
        </nav>
        <Link
          to="/"
          className="flex items-center gap-2 border-t border-sidebar-border px-5 py-4 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          В пользовательскую часть
        </Link>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-8">
          <div>
            <p className="font-display text-sm font-semibold">FinePapers / Admin</p>
            <p className="text-xs text-muted-foreground">
              {roleLabels || "Административный доступ"}
            </p>
          </div>
          <span className="text-sm text-muted-foreground">
            {profile.user.user_name}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void logout().catch((error: unknown) => console.error("Admin logout failed:", error))}
          >
            Выйти
          </Button>
          <nav className="flex w-full gap-2 md:hidden" aria-label="Административная навигация">
            {profile.sections.map((section) => (
              <Link
                key={section.key}
                to={section.path}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {section.label}
              </Link>
            ))}
            <Link
              to="/"
              className="ml-auto rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              К приложению
            </Link>
          </nav>
        </header>
        <main className="flex-1 p-5 md:p-8">
          <Outlet context={profile} />
        </main>
      </div>
    </div>
  );
}

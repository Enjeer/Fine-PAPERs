import { useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAdminRoles,
  getUserRoleAssignment,
  updateUserRoleAssignment,
  type AdminProfile,
  type AdminRole,
  type UserRoleAssignment,
} from "@/lib/admin-api";
import { useQuery } from "@tanstack/react-query";

function firstMessage(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map(firstMessage).find((message) => message !== undefined);
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value)
      .map(firstMessage)
      .find((message) => message !== undefined);
  }
  return undefined;
}

function errorText(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data;
    const message = firstMessage(data);
    if (message) return message;
  }
  return error instanceof Error ? error.message : "Не удалось выполнить запрос.";
}

export default function AdminRolesPage() {
  const profile = useOutletContext<AdminProfile>();
  const rolesQuery = useQuery({
    queryKey: ["admin-roles"],
    queryFn: getAdminRoles,
    enabled: profile.sections.some((section) => section.key === "role_management"),
    retry: false,
  });
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [assignment, setAssignment] = useState<UserRoleAssignment | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<AdminRole["name"][]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!profile.sections.some((section) => section.key === "role_management")) {
    return (
      <section className="mx-auto max-w-2xl space-y-2 py-12 text-center" role="alert">
        <h1 className="font-display text-2xl font-bold">Нет доступа</h1>
        <p className="text-muted-foreground">
          Управлять ролями может только администратор платформы.
        </p>
      </section>
    );
  }

  async function loadAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);
    try {
      const result = await getUserRoleAssignment(userId.trim());
      setAssignment(result);
      setSelectedRoles(result.roles);
    } catch (loadError: unknown) {
      setAssignment(null);
      setSelectedRoles([]);
      setError(errorText(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  async function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignment) return;
    setError("");
    setMessage("");
    setIsLoading(true);
    const unchanged =
      selectedRoles.length === assignment.roles.length &&
      selectedRoles.every((role) => assignment.roles.includes(role));
    try {
      const result = await updateUserRoleAssignment(assignment.user.id, {
        roles: selectedRoles,
        reason,
      });
      setAssignment(result);
      setSelectedRoles(result.roles);
      setReason("");
      setMessage(
        unchanged
          ? "Назначения не изменились; новая запись аудита не создавалась."
          : "Роли сохранены, изменение записано в аудит.",
      );
    } catch (saveError: unknown) {
      setError(errorText(saveError));
    } finally {
      setIsLoading(false);
    }
  }

  function toggleRole(role: AdminRole["name"], checked: boolean) {
    setSelectedRoles((current) =>
      checked
        ? [...current, role]
        : current.filter((selectedRole) => selectedRole !== role),
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">FinePapers / Admin</p>
        <h1 className="font-display text-2xl font-bold">Роли и доступ</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Укажите UUID существующего пользователя. Самостоятельно менять свои роли
          через API нельзя; каждое изменение требует причины и попадает в аудит.
        </p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={loadAssignment}>
        <div className="flex-1 space-y-2">
          <Label htmlFor="admin-user-id">UUID пользователя</Label>
          <Input
            id="admin-user-id"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            required
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          Загрузить роли
        </Button>
      </form>

      {rolesQuery.isError && (
        <p role="alert" className="text-sm text-destructive">
          {errorText(rolesQuery.error)}
        </p>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm text-primary">{message}</p>}

      {assignment && (
        <form className="space-y-5 rounded-lg border border-border p-5" onSubmit={saveAssignment}>
          <div>
            <h2 className="font-semibold">{assignment.user.user_name}</h2>
            <p className="text-xs text-muted-foreground">{assignment.user.id}</p>
            {assignment.user.is_superuser && (
              <p className="mt-1 text-xs text-muted-foreground">
                Django superuser сохраняет полный доступ независимо от этих назначений.
              </p>
            )}
          </div>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-medium">Назначенные роли</legend>
            {rolesQuery.data?.map((role) => (
              <label key={role.name} className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.name)}
                  onChange={(event) => toggleRole(role.name, event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span>
                  <span className="block font-medium">{role.label}</span>
                  <span className="text-muted-foreground">{role.name}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="role-change-reason">Причина изменения</Label>
            <Input
              id="role-change-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              required
            />
          </div>
          <Button type="submit" disabled={isLoading || !rolesQuery.data}>
            Сохранить назначения
          </Button>
        </form>
      )}
    </div>
  );
}

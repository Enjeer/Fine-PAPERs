import { useState, type FormEvent } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { AdminProfile } from "@/lib/admin-api";
import {
  getSupportCategories,
  getSupportAssignees,
  getSupportQueue,
  type SupportQueueParams,
} from "@/admin/support-api";
import {
  getSupportCategoryName,
  UNSPECIFIED_CATEGORY_FILTER,
} from "@/lib/support-api";

const INITIAL_FILTERS: SupportQueueParams = {
  search: "",
  status: "",
  category: "",
  assignee: "",
  ordering: "-last_message_at",
  page: 1,
};

const STATUS_LABELS: Record<string, string> = {
  new: "Новое",
  in_progress: "В работе",
  waiting_for_user: "Ожидает пользователя",
  waiting_for_support: "Ожидает поддержки",
  resolved: "Решено",
  closed: "Закрыто",
};

function errorText(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const data = (error as { response?: { data?: { detail?: unknown } } }).response?.data;
    if (typeof data?.detail === "string") return data.detail;
  }
  return error instanceof Error ? error.message : "Не удалось загрузить очередь.";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
}

export default function AdminSupportPage() {
  const profile = useOutletContext<AdminProfile>();
  const canViewQueue = profile.permissions.includes("platform_admin.view_support_queue");
  const canAssign = profile.permissions.includes("platform_admin.assign_support_tickets");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [searchInput, setSearchInput] = useState("");

  const categoriesQuery = useQuery({
    queryKey: ["support-categories"],
    queryFn: getSupportCategories,
    enabled: canViewQueue,
    retry: false,
  });
  const queueQuery = useQuery({
    queryKey: ["admin-support-queue", filters],
    queryFn: () => getSupportQueue(filters),
    enabled: canViewQueue,
    retry: false,
  });
  const assigneesQuery = useQuery({
    queryKey: ["admin-support-assignees"],
    queryFn: getSupportAssignees,
    enabled: canViewQueue && canAssign,
    retry: false,
  });

  if (!canViewQueue) {
    return (
      <section className="mx-auto max-w-2xl space-y-2 py-12 text-center" role="alert">
        <h1 className="font-display text-2xl font-bold">Нет доступа</h1>
        <p className="text-muted-foreground">Ваша роль не может просматривать очередь поддержки.</p>
      </section>
    );
  }

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters((current) => ({
      ...current,
      search: searchInput.trim(),
      page: 1,
    }));
  }

  function updateFilter<K extends keyof SupportQueueParams>(
    key: K,
    value: SupportQueueParams[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  }

  const queue = queueQuery.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">FinePapers / Admin</p>
        <h1 className="font-display text-2xl font-bold">Поддержка</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Очередь обращений, доступных вашей административной роли.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Новые</p>
          <p className="mt-1 text-2xl font-semibold">{queue?.summary.new_count ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Ожидают ответа поддержки</p>
          <p className="mt-1 text-2xl font-semibold">
            {queue?.summary.waiting_for_support_count ?? "—"}
          </p>
        </div>
      </div>

      {queue && (
        <section className="space-y-3 rounded-lg border border-border p-4" aria-label="Сводка по категориям">
          <h2 className="font-medium">Обращения по категориям</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categoriesQuery.data?.map((category) => (
              <div key={category.code} className="rounded-md bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">{category.name}</p>
                <p className="mt-1 text-lg font-semibold">
                  {queue.summary.category_counts[category.code] ?? 0}
                </p>
              </div>
            ))}
            <div className="rounded-md bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Не указана</p>
              <p className="mt-1 text-lg font-semibold">
                {queue.summary.unspecified_category_count}
              </p>
            </div>
          </div>
        </section>
      )}

      <form className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-3" onSubmit={applySearch}>
        <div className="flex gap-2 md:col-span-3">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Поиск по теме, полному ID или пользователю"
            aria-label="Поиск обращений"
          />
          <Button type="submit">Найти</Button>
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Фильтр по статусу"
          value={filters.status}
          onChange={(event) => updateFilter("status", event.target.value)}
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Фильтр по категории"
          value={filters.category}
          onChange={(event) => updateFilter("category", event.target.value)}
        >
          <option value="">Все категории</option>
          {categoriesQuery.data?.map((category) => (
            <option key={category.code} value={category.code}>{category.name}</option>
          ))}
          <option value={UNSPECIFIED_CATEGORY_FILTER}>Не указана</option>
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Сортировка"
          value={filters.ordering}
          onChange={(event) => updateFilter("ordering", event.target.value as SupportQueueParams["ordering"])}
        >
          <option value="-last_message_at">Сначала последнее сообщение</option>
          <option value="last_message_at">Сначала старые сообщения</option>
          <option value="-created_at">Сначала новые обращения</option>
          <option value="created_at">Сначала старые обращения</option>
        </select>
        {canAssign && (
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm md:col-span-3"
            aria-label="Фильтр по ответственному"
            value={filters.assignee}
            onChange={(event) => updateFilter("assignee", event.target.value)}
          >
            <option value="">Все ответственные</option>
            <option value="unassigned">Без ответственного</option>
            {assigneesQuery.data?.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>{assignee.user_name}</option>
            ))}
          </select>
        )}
      </form>

      {queueQuery.isLoading && (
        <p className="py-8 text-center text-sm text-muted-foreground" aria-live="polite">
          Загружаем очередь…
        </p>
      )}
      {queueQuery.isError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 p-4 text-sm text-destructive">
          <span>{errorText(queueQuery.error)}</span>
          <Button variant="outline" size="sm" onClick={() => void queueQuery.refetch()}>Повторить</Button>
        </div>
      )}
      {assigneesQuery.isError && (
        <p role="alert" className="text-sm text-destructive">{errorText(assigneesQuery.error)}</p>
      )}
      {categoriesQuery.isError && (
        <p role="alert" className="text-sm text-destructive">{errorText(categoriesQuery.error)}</p>
      )}

      {queue && (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Тема / пользователь</th>
                  <th className="px-4 py-3">Категория</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Создано</th>
                  <th className="px-4 py-3">Последнее сообщение</th>
                  <th className="px-4 py-3">Ответственный</th>
                  <th className="px-4 py-3">Сообщения</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {queue.results.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/support/${ticket.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {ticket.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ticket.user.user_name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {getSupportCategoryName(ticket.category, categoriesQuery.data ?? [])}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ticket.status === "new" ? "default" : "outline"}>
                        {STATUS_LABELS[ticket.status] ?? ticket.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(ticket.created_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(ticket.last_message_at)}</td>
                    <td className="px-4 py-3">{ticket.assignee?.user_name ?? "Не назначен"}</td>
                    <td className="px-4 py-3">{ticket.message_count}</td>
                  </tr>
                ))}
                {queue.results.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      Обращения не найдены.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Всего обращений: {queue.count} · Страница {filters.page}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!queue.previous || queueQuery.isFetching}
                onClick={() => updateFilter("page", Math.max(1, filters.page - 1))}
              >
                Назад
              </Button>
              <Button
                variant="outline"
                disabled={!queue.next || queueQuery.isFetching}
                onClick={() => updateFilter("page", filters.page + 1)}
              >
                Далее
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

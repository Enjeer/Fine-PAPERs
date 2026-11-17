import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminProfile } from "@/lib/admin-api";
import {
  addSupportNote,
  assignSupportTicket,
  downloadSupportAttachment,
  getSupportCategories,
  getSupportAssignees,
  getSupportTicket,
  sendSupportReply,
  updateSupportStatus,
} from "@/admin/support-api";
import { getSupportCategoryName } from "@/lib/support-api";

const STATUSES = [
  ["new", "Новое"],
  ["in_progress", "В работе"],
  ["waiting_for_user", "Ожидает пользователя"],
  ["waiting_for_support", "Ожидает поддержки"],
  ["resolved", "Решено"],
  ["closed", "Закрыто"],
] as const;

function errorText(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const data = (error as { response?: { data?: { detail?: unknown } } }).response?.data;
    if (typeof data?.detail === "string") return data.detail;
  }
  return error instanceof Error ? error.message : "Не удалось выполнить запрос.";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
}

function requestKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export default function AdminSupportTicketPage() {
  const profile = useOutletContext<AdminProfile>();
  const { ticketId = "" } = useParams();
  const canView = profile.permissions.includes("platform_admin.view_support_tickets");
  const canReply = profile.permissions.includes("platform_admin.reply_support_tickets");
  const canManage = profile.permissions.includes("platform_admin.manage_support_tickets");
  const canAssign = profile.permissions.includes("platform_admin.assign_support_tickets");
  const canAddNotes = profile.permissions.includes("platform_admin.add_internal_support_notes");

  const ticketQuery = useQuery({
    queryKey: ["admin-support-ticket", ticketId],
    queryFn: () => getSupportTicket(ticketId),
    enabled: canView && Boolean(ticketId),
    retry: false,
  });
  const categoriesQuery = useQuery({
    queryKey: ["support-categories"],
    queryFn: getSupportCategories,
    enabled: canView,
    retry: false,
  });
  const assigneesQuery = useQuery({
    queryKey: ["admin-support-assignees"],
    queryFn: getSupportAssignees,
    enabled: canAssign,
    retry: false,
  });

  const [status, setStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [reply, setReply] = useState("");
  const [replyKey, setReplyKey] = useState(requestKey);
  const [note, setNote] = useState("");
  const [noteKey, setNoteKey] = useState(requestKey);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (ticketQuery.data) {
      setStatus(ticketQuery.data.status);
      setAssigneeId(ticketQuery.data.assignee?.id ?? "");
    }
  }, [ticketQuery.data]);

  if (!canView) {
    return (
      <section className="mx-auto max-w-2xl space-y-2 py-12 text-center" role="alert">
        <h1 className="font-display text-2xl font-bold">Нет доступа</h1>
        <p className="text-muted-foreground">Ваша роль не может читать приватное содержимое обращений.</p>
        <Button asChild variant="outline"><Link to="/admin">В административную панель</Link></Button>
      </section>
    );
  }

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    if (isBusy) return;
    setError("");
    setMessage("");
    setIsBusy(true);
    try {
      await action();
      await ticketQuery.refetch();
      setMessage(successMessage);
    } catch (requestError: unknown) {
      setError(errorText(requestError));
    } finally {
      setIsBusy(false);
    }
  }

  const ticket = ticketQuery.data;
  const statusLabel = STATUSES.find(([value]) => value === ticket?.status)?.[1] ?? ticket?.status;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/support" className="text-sm text-muted-foreground hover:text-foreground">
            ← Очередь поддержки
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold">
            {ticket?.title ?? "Карточка обращения"}
          </h1>
        </div>
        {ticket && (
          <Badge variant={ticket.status === "new" ? "default" : "outline"}>
            {statusLabel}
          </Badge>
        )}
      </div>

      {ticketQuery.isLoading && (
        <p className="py-12 text-center text-sm text-muted-foreground" aria-live="polite">
          Загружаем карточку…
        </p>
      )}
      {ticketQuery.isError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 p-4 text-sm text-destructive">
          <span>{errorText(ticketQuery.error)}</span>
          <Button variant="outline" size="sm" onClick={() => void ticketQuery.refetch()}>Повторить</Button>
        </div>
      )}
      {categoriesQuery.isError && (
        <p role="alert" className="text-sm text-destructive">
          Не удалось загрузить справочник категорий: {errorText(categoriesQuery.error)}
        </p>
      )}

      {ticket && (
        <>
          <section className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-muted-foreground">Пользователь</p><p className="mt-1 font-medium">{ticket.user.user_name}</p></div>
            <div><p className="text-xs text-muted-foreground">ID</p><p className="mt-1 break-all font-mono text-xs">{ticket.id}</p></div>
            <div><p className="text-xs text-muted-foreground">Категория / приоритет</p><p className="mt-1">{getSupportCategoryName(ticket.category, categoriesQuery.data ?? [])} / {ticket.priority}</p></div>
            <div><p className="text-xs text-muted-foreground">Создано</p><p className="mt-1">{formatDate(ticket.created_at)}</p></div>
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs text-muted-foreground">Описание обращения</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{ticket.description}</p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Переписка и внутренние заметки</h2>
            {ticket.messages.length === 0 ? (
              <p className="rounded-md border p-4 text-sm text-muted-foreground">Сообщений пока нет.</p>
            ) : ticket.messages.map((item) => (
              <article
                key={item.id}
                className={`rounded-lg border p-4 ${
                  item.is_internal
                    ? "border-amber-400/50 bg-amber-50/70 dark:bg-amber-950/20"
                    : "border-border bg-card"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.author.user_name}</p>
                  {item.is_internal && (
                    <Badge className="border-amber-500/40 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100" variant="outline">
                      Внутренняя заметка — пользователю не видна
                    </Badge>
                  )}
                  <time className="text-xs text-muted-foreground">{formatDate(item.created_at)}</time>
                </div>
                <p className="whitespace-pre-wrap text-sm">{item.text}</p>
              </article>
            ))}
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-semibold">Вложения</h2>
            {ticket.attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Вложений нет.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {ticket.attachments.map((attachment) => (
                  <li key={attachment.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span className="min-w-0 truncate">{attachment.filename} · {Math.ceil(attachment.size / 1024)} КБ</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void downloadSupportAttachment(ticket.id, attachment).catch((downloadError: unknown) => setError(errorText(downloadError)))}
                    >
                      Скачать
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {ticket.status_history && ticket.assignment_history && (
            <section className="grid gap-5 lg:grid-cols-2">
              <div>
                <h2 className="mb-2 font-display text-lg font-semibold">История статусов</h2>
                <ul className="space-y-2">
                  {ticket.status_history.map((event) => (
                    <li key={event.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">
                        {STATUSES.find(([value]) => value === event.previous_status)?.[1] ?? "—"}
                        {" → "}
                        {STATUSES.find(([value]) => value === event.new_status)?.[1] ?? event.new_status}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.actor?.user_name ?? "Система"} · {formatDate(event.created_at)}
                      </p>
                      {event.reason && <p className="mt-1 text-xs text-muted-foreground">{event.reason}</p>}
                    </li>
                  ))}
                  {ticket.status_history.length === 0 && <li className="text-sm text-muted-foreground">История пока пуста.</li>}
                </ul>
              </div>
              <div>
                <h2 className="mb-2 font-display text-lg font-semibold">История назначений</h2>
                <ul className="space-y-2">
                  {ticket.assignment_history.map((event) => (
                    <li key={event.id} className="rounded-md border p-3 text-sm">
                      <p className="font-medium">
                        {event.previous_assignee?.user_name ?? "Не назначен"}
                        {" → "}
                        {event.new_assignee?.user_name ?? "Не назначен"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.actor?.user_name ?? "Система"} · {formatDate(event.created_at)}
                      </p>
                      {event.reason && <p className="mt-1 text-xs text-muted-foreground">{event.reason}</p>}
                    </li>
                  ))}
                  {ticket.assignment_history.length === 0 && <li className="text-sm text-muted-foreground">История пока пуста.</li>}
                </ul>
              </div>
            </section>
          )}

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-primary">{message}</p>}

          <section className="grid gap-5 border-t pt-5 lg:grid-cols-2">
            {canReply && (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAction(
                    async () => {
                      await sendSupportReply(ticket.id, reply.trim(), replyKey);
                      setReply("");
                      setReplyKey(requestKey());
                    },
                    "Публичный ответ отправлен.",
                  );
                }}
              >
                <Label htmlFor="support-public-reply">Публичный ответ пользователю</Label>
                <Textarea
                  id="support-public-reply"
                  rows={4}
                  value={reply}
                  onChange={(event) => {
                    setReply(event.target.value);
                    setReplyKey(requestKey());
                  }}
                  placeholder="Ответ будет виден пользователю"
                />
                <Button type="submit" disabled={isBusy || !reply.trim()}>
                  {isBusy ? "Отправляем…" : "Отправить ответ"}
                </Button>
              </form>
            )}

            {canAddNotes && (
              <form
                className="space-y-3 rounded-md border border-amber-400/50 bg-amber-50/50 p-4 dark:bg-amber-950/10"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAction(
                    async () => {
                      await addSupportNote(ticket.id, note.trim(), noteKey);
                      setNote("");
                      setNoteKey(requestKey());
                    },
                    "Внутренняя заметка добавлена. Она не отправлялась пользователю.",
                  );
                }}
              >
                <Label htmlFor="support-internal-note">Внутренняя заметка</Label>
                <Textarea
                  id="support-internal-note"
                  rows={4}
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value);
                    setNoteKey(requestKey());
                  }}
                  placeholder="Видна только сотрудникам с доступом к тикету"
                />
                <Button type="submit" variant="outline" disabled={isBusy || !note.trim()}>
                  {isBusy ? "Сохраняем…" : "Добавить заметку"}
                </Button>
              </form>
            )}

            {canManage && (
              <form
                className="space-y-3 rounded-md border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (status === ticket.status) return;
                  void runAction(
                    () => updateSupportStatus(ticket.id, status, statusReason),
                    "Статус обновлён.",
                  );
                }}
              >
                <Label htmlFor="support-status">Изменить статус</Label>
                <select
                  id="support-status"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  {STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <Input
                  value={statusReason}
                  onChange={(event) => setStatusReason(event.target.value)}
                  maxLength={255}
                  placeholder="Причина (необязательно)"
                  aria-label="Причина смены статуса"
                />
                <Button type="submit" variant="outline" disabled={isBusy || status === ticket.status}>
                  {isBusy ? "Сохраняем…" : "Сохранить статус"}
                </Button>
              </form>
            )}

            {canAssign && (
              <form
                className="space-y-3 rounded-md border p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAction(
                    () => assignSupportTicket(ticket.id, assigneeId),
                    "Ответственный обновлён.",
                  );
                }}
              >
                <Label htmlFor="support-assignee">Ответственный</Label>
                <select
                  id="support-assignee"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  disabled={assigneesQuery.isLoading || assigneesQuery.isError}
                >
                  <option value="">Не назначен</option>
                  {assigneesQuery.data?.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>{assignee.user_name}</option>
                  ))}
                </select>
                {assigneesQuery.isError && (
                  <p role="alert" className="text-xs text-destructive">{errorText(assigneesQuery.error)}</p>
                )}
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isBusy || assigneesQuery.isLoading || assigneeId === (ticket.assignee?.id ?? "")}
                >
                  {isBusy ? "Сохраняем…" : "Назначить"}
                </Button>
              </form>
            )}
          </section>
        </>
      )}
    </div>
  );
}

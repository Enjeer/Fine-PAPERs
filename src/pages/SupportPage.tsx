import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useTickets, type TicketDetails } from "@/lib/tickets-context";
import { useAuth } from "@/lib/auth-context";
import { getSupportCategoryName } from "@/lib/support-api";
import { Download, FolderOpen, Paperclip, Plus, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  new: { label: "Новое", variant: "default" },
  in_progress: { label: "В работе", variant: "destructive" },
  waiting_for_user: { label: "Ожидает вашего ответа", variant: "secondary" },
  waiting_for_support: { label: "Ожидает поддержки", variant: "outline" },
  resolved: { label: "Решено", variant: "secondary" },
  closed: { label: "Закрыто", variant: "outline" },
};

const FILTERS = [
  "Все",
  "Новые",
  "В работе",
  "Ожидают моего ответа",
  "Ожидают поддержки",
  "Решённые",
  "Закрытые",
] as const;

const FILTER_MAP: Record<(typeof FILTERS)[number], string | null> = {
  Все: null,
  Новые: "new",
  "В работе": "in_progress",
  "Ожидают моего ответа": "waiting_for_user",
  "Ожидают поддержки": "waiting_for_support",
  "Решённые": "resolved",
  Закрытые: "closed",
};

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const data = (error as { response?: { data?: { detail?: unknown } } }).response?.data;
    if (typeof data?.detail === "string") return data.detail;
  }
  return error instanceof Error ? error.message : "Не удалось выполнить запрос.";
}

function dateLabel(value?: string | null) {
  if (!value) return "Нет сообщений";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("ru-RU", {
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function newIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export default function SupportPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const {
    tickets,
    categories,
    categoriesLoading,
    categoriesError,
    isLoading,
    error,
    refreshTickets,
    getTicketDetails,
    createTicket,
    sendMessage,
    uploadAttachment,
    downloadAttachment,
  } = useTickets();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Все");
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    searchParams.get("ticket"),
  );
  const [details, setDetails] = useState<TicketDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [newTheme, setNewTheme] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [reply, setReply] = useState("");
  const [replyKey, setReplyKey] = useState(newIdempotencyKey);
  const [actionError, setActionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);

  useEffect(() => {
    const linkedTicketId = searchParams.get("ticket");
    if (linkedTicketId) setSelectedTicketId(linkedTicketId);
  }, [searchParams]);

  const filtered = useMemo(
    () =>
      tickets.filter((ticket) => {
        const statusMatch = !FILTER_MAP[filter] || ticket.status === FILTER_MAP[filter];
        const searchTerm = search.trim().toLowerCase();
        const searchMatch =
          !searchTerm ||
          ticket.name.toLowerCase().includes(searchTerm) ||
          ticket.id.toLowerCase().includes(searchTerm);
        return statusMatch && searchMatch;
      }),
    [filter, search, tickets],
  );

  useEffect(() => {
    if (!selectedTicketId) {
      setDetails(null);
      return;
    }

    let active = true;
    setDetailsLoading(true);
    setActionError("");
    getTicketDetails(selectedTicketId)
      .then((ticket) => {
        if (active) setDetails(ticket);
      })
      .catch((requestError: unknown) => {
        if (active) setActionError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setDetailsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [getTicketDetails, selectedTicketId]);

  async function handleCreate() {
    const title = newTheme.trim();
    const description = newDesc.trim();
    if (!title || !description || !newCategory || isSubmitting) return;

    setActionError("");
    setIsSubmitting(true);
    try {
      const created = await createTicket({
        name: title,
        description,
        category: newCategory,
      });
      setCreateDialogOpen(false);
      setNewTheme("");
      setNewDesc("");
      setNewCategory("");
      setSelectedTicketId(created.id);
    } catch (requestError: unknown) {
      setActionError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReply() {
    const text = reply.trim();
    const attachments = [...pendingAttachments];
    if (!details || (!text && attachments.length === 0) || isSubmitting) return;
    setActionError("");
    setIsSubmitting(true);
    try {
      if (text) {
        await sendMessage(details.id, text, replyKey);
        setReply("");
        setReplyKey(newIdempotencyKey());
      }

      for (let index = 0; index < attachments.length; index += 1) {
        try {
          await uploadAttachment(details.id, attachments[index]);
          setPendingAttachments((current) =>
            current.filter((file) => file !== attachments[index]),
          );
        } catch (uploadError: unknown) {
          setActionError(
            `${text ? "Сообщение отправлено. " : ""}Не удалось загрузить вложение «${attachments[index].name}»: ${getErrorMessage(uploadError)}`,
          );
          break;
        }
      }
      setDetails(await getTicketDetails(details.id));
    } catch (requestError: unknown) {
      setActionError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectAttachments(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    setPendingAttachments((current) => [...current, ...selected]);
    event.target.value = "";
  }

  const detailStatus = details
    ? STATUS_CONFIG[details.status] ?? STATUS_CONFIG.new
    : STATUS_CONFIG.new;

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6 p-6 lg:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Поддержка</h1>
          <p className="text-sm text-muted-foreground">
            Создавайте обращения и продолжайте переписку с командой поддержки.
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Новое обращение
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Новое обращение</DialogTitle>
            </DialogHeader>
            <div className="mt-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="support-title">Тема</Label>
                <Input
                  id="support-title"
                  value={newTheme}
                  onChange={(event) => setNewTheme(event.target.value)}
                  placeholder="Тема обращения"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-description">Описание</Label>
                <Textarea
                  id="support-description"
                  value={newDesc}
                  onChange={(event) => setNewDesc(event.target.value)}
                  placeholder="Подробно опишите вопрос"
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-category">Категория</Label>
                <select
                  id="support-category"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  required
                  disabled={categoriesLoading || categories.length === 0}
                >
                  <option value="">Выберите категорию</option>
                  {categories.map((category) => (
                    <option key={category.code} value={category.code}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {newCategory && (
                  <p className="text-xs text-muted-foreground">
                    {categories.find((category) => category.code === newCategory)?.description}
                  </p>
                )}
                {categoriesError && (
                  <p role="alert" className="text-sm text-destructive">{categoriesError}</p>
                )}
              </div>
              {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
              <Button
                onClick={() => void handleCreate()}
                className="w-full"
                disabled={
                  isSubmitting ||
                  categoriesLoading ||
                  !newTheme.trim() ||
                  !newDesc.trim() ||
                  !newCategory
                }
              >
                {isSubmitting ? "Создаём…" : "Создать"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 pl-9"
            placeholder="Поиск по теме или ID…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((filterOption) => (
            <Button
              key={filterOption}
              variant={filter === filterOption ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filterOption)}
              className="whitespace-nowrap text-xs"
            >
              {filterOption}
            </Button>
          ))}
        </div>
      </div>

      {(error || actionError && !createDialogOpen) && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          <span>{error || actionError}</span>
          {error && <Button variant="outline" size="sm" onClick={() => void refreshTickets().catch(() => undefined)}>Повторить</Button>}
        </div>
      )}

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground" aria-live="polite">
          Загружаем обращения…
        </p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderOpen className="mb-4 h-12 w-12 opacity-40" />
          <p className="text-lg font-medium">
            {tickets.length === 0 ? "У вас пока нет обращений" : "Обращения не найдены"}
          </p>
          <p className="text-center text-sm">
            {tickets.length === 0
              ? "Создайте первое обращение, чтобы связаться с поддержкой."
              : "Измените фильтр или поисковый запрос."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ticket) => {
            const status = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.new;
            return (
              <Card key={ticket.id} className="border-border transition-colors hover:border-primary/40">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h2 className="line-clamp-1 font-medium">{ticket.name}</h2>
                    <Badge variant={status.variant} className="shrink-0 text-xs">{status.label}</Badge>
                  </div>
                  <p className="mb-3 line-clamp-2 flex-1 text-sm text-muted-foreground">{ticket.description}</p>
                  <p className="mb-3 text-xs text-muted-foreground">
                    {getSupportCategoryName(ticket.category, categories)} · {ticket.messageCount} сообщений · Обновлено {dateLabel(ticket.lastMessageAt ?? ticket.updatedAt)}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSelectedTicketId(ticket.id)}>
                    Открыть переписку
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={selectedTicketId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTicketId(null);
            setActionError("");
          }
        }}
      >
        <DialogContent className="flex h-[90dvh] max-h-[90dvh] w-[calc(100%-1rem)] flex-col overflow-hidden p-4 sm:max-w-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-display">
              {details?.name ?? "Обращение"}
            </DialogTitle>
          </DialogHeader>
          {detailsLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Загружаем переписку…</p>
          ) : details ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Создано: {dateLabel(details.createdAt)}</span>
                  <span>Категория: {getSupportCategoryName(details.category, categories)}</span>
                </div>
                <Badge variant={detailStatus.variant}>{detailStatus.label}</Badge>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-3 pr-1">
                <article className="rounded-md border bg-muted/40 p-4">
                  <p className="mb-1 text-xs text-muted-foreground">
                    Вы · {dateLabel(details.createdAt)}
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{details.description}</p>
                </article>
                {details.messages
                  .filter((message) => !message.is_internal)
                  .slice()
                  .sort(
                    (left, right) =>
                      new Date(left.created_at).getTime() -
                      new Date(right.created_at).getTime(),
                  )
                  .map((message) => {
                    const isOwnMessage = message.author.id === user?.id;
                    return (
                      <article
                        key={message.id}
                        className={`max-w-[90%] rounded-md border p-3 ${
                          isOwnMessage
                            ? "ml-auto bg-primary/5"
                            : "mr-auto bg-muted/30"
                        }`}
                      >
                        <p className="mb-1 text-xs text-muted-foreground">
                          {isOwnMessage ? "Вы" : "Поддержка"} · {dateLabel(message.created_at)}
                        </p>
                        <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                      </article>
                    );
                  })}
                {details.attachments.length > 0 && (
                  <ul className="space-y-1" aria-label="Вложения обращения">
                    {details.attachments.map((attachment) => (
                      <li
                        key={attachment.id}
                        className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2 truncate">
                          <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {attachment.filename}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void downloadAttachment(details.id, attachment).catch(
                              (downloadError: unknown) =>
                                setActionError(getErrorMessage(downloadError)),
                            )
                          }
                          aria-label={`Скачать ${attachment.filename}`}
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2 border-t pt-3">
                {pendingAttachments.length > 0 && (
                  <ul className="flex flex-wrap gap-2" aria-label="Файлы к отправке">
                    {pendingAttachments.map((file, index) => (
                      <li
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="flex max-w-full items-center gap-2 rounded-md border px-2 py-1 text-xs"
                      >
                        <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="max-w-48 truncate">{file.name}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() =>
                            setPendingAttachments((current) =>
                              current.filter((_, fileIndex) => fileIndex !== index),
                            )
                          }
                          aria-label={`Удалить вложение ${file.name}`}
                        >
                          <span aria-hidden="true">×</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Label htmlFor="support-reply" className="sr-only">
                  Новое сообщение
                </Label>
                <Textarea
                  id="support-reply"
                  rows={3}
                  className="max-h-32 resize-y"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Напишите сообщение…"
                  disabled={isSubmitting}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="support-file"
                      type="file"
                      multiple
                      accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,.docx"
                      disabled={isSubmitting || details.status === "closed"}
                      onChange={selectAttachments}
                      className="sr-only"
                    />
                    <Label
                      htmlFor="support-file"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Paperclip className="h-4 w-4" aria-hidden="true" />
                      Прикрепить
                    </Label>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      До 10 МБ на файл
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void handleReply()}
                    disabled={
                      isSubmitting ||
                      (!reply.trim() && pendingAttachments.length === 0) ||
                      (details.status === "closed" && !reply.trim())
                    }
                  >
                    {isSubmitting
                      ? "Отправляем…"
                      : details.status === "closed"
                        ? "Ответить и открыть"
                        : "Отправить"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  PDF, TXT, PNG, JPG, WEBP или DOCX.
                </p>
                {actionError && (
                  <p role="alert" className="text-sm text-destructive">
                    {actionError}
                  </p>
                )}
              </div>
            </>
          ) : actionError ? (
            <p role="alert" className="text-sm text-destructive">{actionError}</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

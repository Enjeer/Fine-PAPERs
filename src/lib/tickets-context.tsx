import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { api } from "./axios";
import { getSupportCategories, type SupportCategory } from "./support-api";

export type TicketStatus =
  | "new"
  | "in_progress"
  | "waiting_for_user"
  | "waiting_for_support"
  | "resolved"
  | "closed";

export interface Ticket {
  id: string;
  name: string;
  description: string;
  status: TicketStatus;
  updatedAt: string;
  createdAt: string;
  lastMessageAt?: string | null;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  messageCount: number;
}

export interface TicketUser {
  id: string;
  user_name: string;
}

export interface TicketMessage {
  id: string;
  author: TicketUser;
  text: string;
  is_internal: boolean;
  created_at: string;
}

export interface TicketAttachment {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
}

export interface TicketDetails extends Ticket {
  user: TicketUser;
  assignee: TicketUser | null;
  messages: TicketMessage[];
  attachments: TicketAttachment[];
}

interface ApiTicket {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  status?: string;
  updated_at?: string;
  updatedAt?: string;
  created_at?: string;
  createdAt?: string;
  last_message_at?: string | null;
  category?: string;
  priority?: Ticket["priority"];
  message_count?: number;
}

interface TicketsContextType {
  tickets: Ticket[];
  categories: SupportCategory[];
  categoriesLoading: boolean;
  categoriesError: string;
  isLoading: boolean;
  error: string;
  getTicket: (id: string) => Ticket | undefined;
  refreshTickets: () => Promise<void>;
  getTicketDetails: (id: string) => Promise<TicketDetails>;
  createTicket: (
    data: Pick<Ticket, "name" | "description" | "category"> &
      Partial<Pick<Ticket, "priority">>,
  ) => Promise<Ticket>;
  sendMessage: (id: string, text: string, idempotencyKey: string) => Promise<void>;
  uploadAttachment: (id: string, file: File) => Promise<void>;
  downloadAttachment: (ticketId: string, attachment: TicketAttachment) => Promise<void>;
  closeTicket: (id: string) => Promise<void>;
}

const TicketsContext = createContext<TicketsContextType | null>(null);

function normalizeStatus(status?: string): TicketStatus {
  switch (status) {
    case "active":
      return "new";
    case "inProgress":
      return "in_progress";
    case "done":
      return "resolved";
    case "in_progress":
    case "waiting_for_user":
    case "waiting_for_support":
    case "resolved":
    case "closed":
      return status;
    default:
      return "new";
  }
}

function normalizeTicket(item: ApiTicket): Ticket {
  return {
    id: item.id,
    name: item.title ?? item.name ?? "Без темы",
    description: item.description ?? "",
    status: normalizeStatus(item.status),
    updatedAt: item.updated_at ?? item.updatedAt ?? "",
    createdAt: item.created_at ?? item.createdAt ?? "",
    lastMessageAt: item.last_message_at,
    category: item.category ?? "",
    priority: item.priority ?? "normal",
    messageCount: item.message_count ?? 0,
  };
}

function errorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { detail?: unknown } } }).response;
    if (typeof response?.data?.detail === "string") return response.data.detail;
  }
  return error instanceof Error ? error.message : "Не удалось выполнить запрос.";
}

export function TicketsProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<SupportCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshTickets = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await api.get<ApiTicket[]>("support/tickets/");
      setTickets(Array.isArray(response.data) ? response.data.map(normalizeTicket) : []);
    } catch (requestError: unknown) {
      setError(errorMessage(requestError));
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError("");
    try {
      setCategories(await getSupportCategories());
    } catch (requestError: unknown) {
      setCategoriesError(errorMessage(requestError));
      throw requestError;
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTickets().catch(() => undefined);
  }, [refreshTickets]);

  useEffect(() => {
    void refreshCategories().catch(() => undefined);
  }, [refreshCategories]);

  const getTicket = useCallback(
    (id: string) => tickets.find((ticket) => ticket.id === id),
    [tickets],
  );

  const getTicketDetails = useCallback(async (id: string) => {
    const response = await api.get<TicketDetails>(`support/tickets/${id}/`);
    return {
      ...normalizeTicket(response.data),
      user: response.data.user,
      assignee: response.data.assignee,
      messages: response.data.messages,
      attachments: response.data.attachments,
    };
  }, []);

  const createTicket = useCallback(
    async (
      data: Pick<Ticket, "name" | "description" | "category"> &
        Partial<Pick<Ticket, "priority">>,
    ) => {
      const response = await api.post<ApiTicket>("support/tickets/", {
        title: data.name,
        description: data.description,
        category: data.category,
        priority: data.priority ?? "normal",
      });
      const createdTicket = normalizeTicket(response.data);
      setTickets((previous) => [createdTicket, ...previous]);
      return createdTicket;
    },
    [],
  );

  const sendMessage = useCallback(
    async (id: string, text: string, idempotencyKey: string) => {
      await api.post(
        `support/tickets/${id}/messages/`,
        { text },
        { headers: { "Idempotency-Key": idempotencyKey } },
      );
      await refreshTickets();
    },
    [refreshTickets],
  );

  const uploadAttachment = useCallback(async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    await api.post(`support/tickets/${id}/attachments/`, formData);
  }, []);

  const downloadAttachment = useCallback(
    async (ticketId: string, attachment: TicketAttachment) => {
      const response = await api.get<Blob>(
        `support/tickets/${ticketId}/attachments/${attachment.id}/`,
        { responseType: "blob" },
      );
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachment.filename;
      link.click();
      URL.revokeObjectURL(objectUrl);
    },
    [],
  );

  const closeTicket = useCallback(
    async (id: string) => {
      await api.delete(`support/tickets/${id}/`);
      await refreshTickets();
    },
    [refreshTickets],
  );

  return (
    <TicketsContext.Provider
      value={{
        tickets,
        categories,
        categoriesLoading,
        categoriesError,
        isLoading,
        error,
        getTicket,
        refreshTickets,
        getTicketDetails,
        createTicket,
        sendMessage,
        uploadAttachment,
        downloadAttachment,
        closeTicket,
      }}
    >
      {children}
    </TicketsContext.Provider>
  );
}

export function useTickets() {
  const context = useContext(TicketsContext);
  if (!context) throw new Error("useTickets must be inside TicketsProvider");
  return context;
}

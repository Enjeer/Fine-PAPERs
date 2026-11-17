import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SupportPage from "./SupportPage";
import { useTickets } from "@/lib/tickets-context";

vi.mock("@/lib/tickets-context", () => ({
  useTickets: vi.fn(),
}));

const ticket = {
  id: "ticket-1",
  name: "Вопрос",
  description: "Описание обращения",
  status: "waiting_for_user" as const,
  updatedAt: "2026-01-01T10:00:00Z",
  createdAt: "2026-01-01T10:00:00Z",
  lastMessageAt: "2026-01-01T11:00:00Z",
  category: "technical",
  priority: "normal" as const,
  messageCount: 1,
};

const categories = [
  {
    code: "technical",
    name: "Техническая проблема",
    description: "Ошибки интерфейса и нестабильная работа",
  },
];

const details = {
  ...ticket,
  user: { id: "owner", user_name: "owner" },
  assignee: null,
  messages: [{
    id: "reply-1",
    author: { id: "agent", user_name: "agent" },
    text: "Уточните, пожалуйста",
    is_internal: false,
    created_at: "2026-01-01T11:00:00Z",
  }],
  attachments: [],
};

describe("SupportPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("opens a ticket conversation and sends a public user reply", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const getTicketDetails = vi.fn().mockResolvedValue(details);
    vi.mocked(useTickets).mockReturnValue({
      tickets: [ticket],
      categories,
      categoriesLoading: false,
      categoriesError: "",
      isLoading: false,
      error: "",
      getTicket: vi.fn(),
      refreshTickets: vi.fn(),
      getTicketDetails,
      createTicket: vi.fn(),
      sendMessage,
      uploadAttachment: vi.fn(),
      downloadAttachment: vi.fn(),
      closeTicket: vi.fn(),
    });

    render(
      <MemoryRouter>
        <SupportPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Открыть переписку" }));
    expect(await screen.findByText("Уточните, пожалуйста")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ответ"), { target: { value: "Спасибо" } });
    fireEvent.click(screen.getByRole("button", { name: "Отправить ответ" }));

    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith("ticket-1", "Спасибо", expect.any(String)),
    );
  });

  it("creates a ticket through the API context and retains visible failure state", async () => {
    const createTicket = vi.fn().mockRejectedValue(new Error("API unavailable"));
    vi.mocked(useTickets).mockReturnValue({
      tickets: [],
      categories,
      categoriesLoading: false,
      categoriesError: "",
      isLoading: false,
      error: "",
      getTicket: vi.fn(),
      refreshTickets: vi.fn(),
      getTicketDetails: vi.fn(),
      createTicket,
      sendMessage: vi.fn(),
      uploadAttachment: vi.fn(),
      downloadAttachment: vi.fn(),
      closeTicket: vi.fn(),
    });

    render(
      <MemoryRouter>
        <SupportPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Новое обращение" }));
    fireEvent.change(screen.getByLabelText("Тема"), { target: { value: "Нужна помощь" } });
    fireEvent.change(screen.getByLabelText("Описание"), { target: { value: "Подробности" } });
    fireEvent.change(screen.getByLabelText("Категория"), { target: { value: "technical" } });
    fireEvent.click(screen.getByRole("button", { name: "Создать" }));

    await waitFor(() =>
      expect(createTicket).toHaveBeenCalledWith({
        name: "Нужна помощь",
        description: "Подробности",
        category: "technical",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("API unavailable");
  });

  it("opens the ticket referenced by a notification link", async () => {
    const getTicketDetails = vi.fn().mockResolvedValue(details);
    vi.mocked(useTickets).mockReturnValue({
      tickets: [ticket],
      categories,
      categoriesLoading: false,
      categoriesError: "",
      isLoading: false,
      error: "",
      getTicket: vi.fn(),
      refreshTickets: vi.fn(),
      getTicketDetails,
      createTicket: vi.fn(),
      sendMessage: vi.fn(),
      uploadAttachment: vi.fn(),
      downloadAttachment: vi.fn(),
      closeTicket: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/support?ticket=ticket-1"]}>
        <Routes>
          <Route path="/support" element={<SupportPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Уточните, пожалуйста")).toBeInTheDocument();
    expect(getTicketDetails).toHaveBeenCalledWith("ticket-1");
  });

  it("shows a neutral category label for a legacy ticket without one", async () => {
    const legacyTicket = { ...ticket, category: "" };
    vi.mocked(useTickets).mockReturnValue({
      tickets: [legacyTicket],
      categories,
      categoriesLoading: false,
      categoriesError: "",
      isLoading: false,
      error: "",
      getTicket: vi.fn(),
      refreshTickets: vi.fn(),
      getTicketDetails: vi.fn().mockResolvedValue({
        ...details,
        ...legacyTicket,
      }),
      createTicket: vi.fn(),
      sendMessage: vi.fn(),
      uploadAttachment: vi.fn(),
      downloadAttachment: vi.fn(),
      closeTicket: vi.fn(),
    });

    render(
      <MemoryRouter>
        <SupportPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Не указана · 1 сообщений/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Открыть переписку" }));
    expect(await screen.findByText("Категория: Не указана")).toBeInTheDocument();
  });
});

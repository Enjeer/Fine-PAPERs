import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import AdminSupportPage from "./AdminSupportPage";
import AdminSupportTicketPage from "./AdminSupportTicketPage";
import {
  addSupportNote,
  assignSupportTicket,
  getSupportCategories,
  getSupportAssignees,
  getSupportQueue,
  getSupportTicket,
  sendSupportReply,
  updateSupportStatus,
} from "@/admin/support-api";
import type { AdminProfile } from "@/lib/admin-api";

vi.mock("@/admin/support-api", () => ({
  addSupportNote: vi.fn(),
  assignSupportTicket: vi.fn(),
  downloadSupportAttachment: vi.fn(),
  getSupportCategories: vi.fn(),
  getSupportAssignees: vi.fn(),
  getSupportQueue: vi.fn(),
  getSupportTicket: vi.fn(),
  sendSupportReply: vi.fn(),
  updateSupportStatus: vi.fn(),
}));

const profile: AdminProfile = {
  user: { id: "operator", user_name: "operator" },
  roles: ["Support"],
  permissions: [
    "platform_admin.view_support_queue",
    "platform_admin.view_support_tickets",
    "platform_admin.reply_support_tickets",
    "platform_admin.manage_support_tickets",
    "platform_admin.assign_support_tickets",
    "platform_admin.add_internal_support_notes",
  ],
  sections: [{ key: "support", label: "Поддержка", path: "/admin/support" }],
};

const ticket = {
  id: "ticket-1",
  user: { id: "user-1", user_name: "customer" },
  title: "Не работает вход",
  description: "Не могу войти",
  category: "technical",
  priority: "normal",
  status: "new",
  assignee: null,
  created_at: "2026-01-01T10:00:00Z",
  updated_at: "2026-01-01T10:00:00Z",
  last_message_at: null,
  resolved_at: null,
  closed_at: null,
  message_count: 2,
  messages: [
    {
      id: "message-1",
      author: { id: "user-1", user_name: "customer" },
      text: "Не могу войти",
      is_internal: false,
      created_at: "2026-01-01T10:00:00Z",
    },
    {
      id: "message-2",
      author: { id: "operator", user_name: "operator" },
      text: "Проверить авторизацию",
      is_internal: true,
      created_at: "2026-01-01T10:05:00Z",
    },
  ],
  attachments: [],
  status_history: [],
  assignment_history: [],
};

const categories = [
  {
    code: "technical",
    name: "Техническая проблема",
    description: "Ошибки интерфейса и нестабильная работа",
  },
  {
    code: "generation",
    name: "Генерация",
    description: "Ошибки генерации",
  },
];

function renderAdmin(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<Outlet context={profile} />}>
            <Route path="/admin/support" element={<AdminSupportPage />} />
            <Route path="/admin/support/:ticketId" element={<AdminSupportTicketPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Admin support pages", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads the paginated queue, applies search and links to a ticket", async () => {
    vi.mocked(getSupportQueue).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      summary: {
        new_count: 1,
        waiting_for_support_count: 0,
        category_counts: { technical: 1, generation: 0 },
        unspecified_category_count: 0,
      },
      results: [ticket],
    });
    vi.mocked(getSupportCategories).mockResolvedValue(categories);
    vi.mocked(getSupportAssignees).mockResolvedValue([
      { id: "operator", user_name: "operator" },
    ]);

    renderAdmin("/admin/support");

    expect(await screen.findByText("Не работает вход")).toBeInTheDocument();
    expect(screen.getByText(/Всего обращений: 1/)).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Техническая проблема/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Не работает вход" })).toHaveAttribute(
      "href",
      "/admin/support/ticket-1",
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Поиск обращений" }), {
      target: { value: "customer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Найти" }));
    await waitFor(() =>
      expect(getSupportQueue).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "customer", page: 1 }),
      ),
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Фильтр по статусу" }), {
      target: { value: "new" },
    });
    await waitFor(() =>
      expect(getSupportQueue).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "new", search: "customer" }),
      ),
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Фильтр по категории" }), {
      target: { value: "technical" },
    });
    await waitFor(() =>
      expect(getSupportQueue).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: "technical", search: "customer" }),
      ),
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Фильтр по ответственному" }), {
      target: { value: "operator" },
    });
    await waitFor(() =>
      expect(getSupportQueue).toHaveBeenLastCalledWith(
        expect.objectContaining({ assignee: "operator", category: "technical" }),
      ),
    );
  });

  it("loads private conversation and submits reply, note, status and assignment actions", async () => {
    vi.mocked(getSupportTicket).mockResolvedValue(ticket);
    vi.mocked(getSupportCategories).mockResolvedValue(categories);
    vi.mocked(getSupportAssignees).mockResolvedValue([
      { id: "operator", user_name: "operator" },
    ]);

    renderAdmin("/admin/support/ticket-1");

    expect(await screen.findByText("Внутренняя заметка — пользователю не видна")).toBeInTheDocument();
    expect(screen.getByText("Проверить авторизацию")).toBeInTheDocument();
    expect(screen.getByText("Техническая проблема / normal")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Публичный ответ пользователю"), {
      target: { value: "Мы проверим" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Отправить ответ" }));
    await waitFor(() =>
      expect(sendSupportReply).toHaveBeenCalledWith(
        "ticket-1",
        "Мы проверим",
        expect.any(String),
      ),
    );

    fireEvent.change(screen.getByLabelText("Внутренняя заметка"), {
      target: { value: "Проверить логи" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Добавить заметку" }));
    await waitFor(() =>
      expect(addSupportNote).toHaveBeenCalledWith(
        "ticket-1",
        "Проверить логи",
        expect.any(String),
      ),
    );

    fireEvent.change(screen.getByLabelText("Изменить статус"), {
      target: { value: "in_progress" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить статус" }));
    await waitFor(() =>
      expect(updateSupportStatus).toHaveBeenCalledWith(
        "ticket-1",
        "in_progress",
        "",
      ),
    );

    fireEvent.change(screen.getByLabelText("Ответственный"), {
      target: { value: "operator" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Назначить" }));
    await waitFor(() =>
      expect(assignSupportTicket).toHaveBeenCalledWith("ticket-1", "operator"),
    );
  });

  it("shows API failures and blocks a role without ticket permissions", async () => {
    vi.mocked(getSupportTicket).mockRejectedValue({
      response: { data: { detail: "Запрос отклонён" } },
    });
    renderAdmin("/admin/support/ticket-1");
    expect(await screen.findByText("Запрос отклонён")).toBeInTheDocument();

    cleanup();
    vi.clearAllMocks();
    const analystProfile = { ...profile, permissions: ["platform_admin.view_admin_dashboard"] };
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/admin/support"]}>
          <Routes>
            <Route element={<Outlet context={analystProfile} />}>
              <Route path="/admin/support" element={<AdminSupportPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Ваша роль не может просматривать очередь поддержки.")).toBeInTheDocument();
    expect(getSupportQueue).not.toHaveBeenCalled();
  });
});

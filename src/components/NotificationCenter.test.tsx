import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificationCenter from "./NotificationCenter";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications-api";

vi.mock("@/lib/notifications-api", () => ({
  getNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
}));

vi.mock("@/components/ui/popover", async () => {
  const React = await import("react");
  const PopoverContext = React.createContext<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
  } | null>(null);

  function MockPopover({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) {
    return React.createElement(
      PopoverContext.Provider,
      { value: { open, onOpenChange } },
      children,
    );
  }

  function MockPopoverTrigger({ children }: { children: React.ReactNode }) {
    const context = React.useContext(PopoverContext);
    if (!context) throw new Error("Popover trigger has no parent.");
    return React.createElement(
      "div",
      { onClick: () => context.onOpenChange(!context.open) },
      children,
    );
  }

  function MockPopoverContent({ children }: { children: React.ReactNode }) {
    const context = React.useContext(PopoverContext);
    if (!context) throw new Error("Popover content has no parent.");
    return context.open ? React.createElement("div", {}, children) : null;
  }

  return {
    Popover: MockPopover,
    PopoverTrigger: MockPopoverTrigger,
    PopoverContent: MockPopoverContent,
  };
});

const notification = {
  id: "notification-1",
  type: "support.ticket.public_reply",
  title: "Ответ поддержки",
  message: "Мы ответили на ваше обращение.",
  payload: { ticket_id: "ticket-123" },
  route: "/support?ticket=ticket-123",
  created_at: "2026-11-16T12:00:00Z",
  read_at: null,
};

function LocationOutput() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderCenter() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <NotificationCenter collapsed={false} />
      <Routes>
        <Route path="*" element={<LocationOutput />} />
      </Routes>
    </MemoryRouter>,
  );
}

function flushUpdates() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("NotificationCenter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUnreadNotificationCount).mockResolvedValue(1);
    vi.mocked(getNotifications).mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [notification],
    });
    vi.mocked(markNotificationRead).mockResolvedValue({
      ...notification,
      read_at: "2026-11-16T12:01:00Z",
    });
    vi.mocked(markAllNotificationsRead).mockResolvedValue({ updated: 1 });
  });

  it("loads notifications, displays the count, marks a notification read, and navigates", async () => {
    renderCenter();
    await act(flushUpdates);
    expect(screen.getByRole("button", { name: /непрочитанных: 1/ })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Уведомления/ }));
      await flushUpdates();
    });

    expect(screen.getByText("Мы ответили на ваше обращение.")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByText("Ответ поддержки"));
      await flushUpdates();
    });

    expect(markNotificationRead).toHaveBeenCalledWith("notification-1");
    expect(screen.getByTestId("location")).toHaveTextContent("/support?ticket=ticket-123");
  });

  it("marks all notifications read", async () => {
    renderCenter();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Уведомления/ }));
      await flushUpdates();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Прочитать все/ }));
      await flushUpdates();
    });
    expect(markAllNotificationsRead).toHaveBeenCalledOnce();
  });

  it("shows an empty state and reports API failures", async () => {
    vi.mocked(getNotifications).mockResolvedValue({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
    renderCenter();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Уведомления/ }));
      await flushUpdates();
    });
    expect(screen.getByText("У вас пока нет уведомлений.")).toBeInTheDocument();
  });

  it("shows an API error and a retry action", async () => {
    vi.mocked(getNotifications).mockRejectedValue(new Error("Request failed"));
    renderCenter();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Уведомления/ }));
      await flushUpdates();
    });
    expect(screen.getByText("Не удалось загрузить уведомления.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import AdminRolesPage from "./AdminRolesPage";
import type { AdminProfile, AdminRole } from "@/lib/admin-api";
import {
  getAdminRoles,
  getUserRoleAssignment,
  updateUserRoleAssignment,
} from "@/lib/admin-api";

vi.mock("@/lib/admin-api", () => ({
  getAdminRoles: vi.fn(),
  getUserRoleAssignment: vi.fn(),
  updateUserRoleAssignment: vi.fn(),
}));

const profile: AdminProfile = {
  user: { id: "admin-id", user_name: "admin" },
  roles: ["Admin"],
  permissions: ["platform_admin.manage_admin_roles"],
  sections: [
    {
      key: "role_management",
      label: "Роли и доступ",
      path: "/admin/roles/",
    },
  ],
};

const roleOptions: AdminRole[] = [
  { name: "Admin", label: "Администратор" },
  { name: "Support", label: "Поддержка" },
  { name: "Moderator", label: "Модератор" },
  { name: "Analyst", label: "Аналитик" },
];

function RolesPageHarness() {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false } },
        })
      }
    >
      <MemoryRouter initialEntries={["/admin/roles/"]}>
        <Routes>
          <Route element={<Outlet context={profile} />}>
            <Route path="/admin/roles/" element={<AdminRolesPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("AdminRolesPage", () => {
  beforeEach(() => {
    vi.mocked(getAdminRoles).mockResolvedValue(roleOptions);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads an account's roles and submits an audited assignment", async () => {
    const userId = "3b309d0a-1f91-4b79-9c2b-7fb7780b3c05";
    vi.mocked(getUserRoleAssignment).mockResolvedValue({
      user: { id: userId, user_name: "reviewer", is_superuser: false },
      roles: ["Support"],
    });
    vi.mocked(updateUserRoleAssignment).mockImplementation(
      async (id, payload) => ({
        user: { id, user_name: "reviewer", is_superuser: false },
        roles: payload.roles,
      }),
    );

    render(<RolesPageHarness />);
    fireEvent.change(screen.getByLabelText("UUID пользователя"), {
      target: { value: userId },
    });
    fireEvent.click(screen.getByRole("button", { name: "Загрузить роли" }));

    expect(await screen.findByText("reviewer")).toBeInTheDocument();
    expect(getUserRoleAssignment).toHaveBeenCalledWith(userId);

    fireEvent.click(screen.getByLabelText(/Модератор/));
    fireEvent.change(screen.getByLabelText("Причина изменения"), {
      target: { value: "Approved moderation duty" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить назначения" }));

    await waitFor(() => {
      expect(updateUserRoleAssignment).toHaveBeenCalledWith(userId, {
        roles: ["Support", "Moderator"],
        reason: "Approved moderation duty",
      });
    });
    expect(
      await screen.findByText("Роли сохранены, изменение записано в аудит."),
    ).toBeInTheDocument();
  });
});

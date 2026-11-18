import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminLoginPage from "./AdminLoginPage";

const { adminLogin } = vi.hoisted(() => ({ adminLogin: vi.fn() }));

vi.mock("@/lib/admin-auth-context", () => ({
  useAdminAuth: () => ({
    login: adminLogin,
    isAuthenticated: false,
    isLoading: false,
    restoreError: "",
    restore: vi.fn(),
  }),
}));

describe("AdminLoginPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("submits separate admin credentials and surfaces authentication errors", async () => {
    adminLogin.mockRejectedValue("Неверное имя администратора или пароль.");
    render(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Имя администратора"), {
      target: { value: "site-admin" },
    });
    fireEvent.change(screen.getByLabelText("Пароль"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));

    await waitFor(() =>
      expect(adminLogin).toHaveBeenCalledWith("site-admin", "wrong-password"),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Неверное имя администратора или пароль.",
    );
  });
});

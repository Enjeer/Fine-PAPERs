import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminProtectedRoute from "./AdminProtectedRoute";

vi.mock("@/lib/admin-auth-context", () => ({
  useAdminAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    restoreError: "",
    restore: vi.fn(),
  }),
}));

describe("AdminProtectedRoute", () => {
  afterEach(cleanup);

  it("redirects an expired admin session to the separate login page", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/support"]}>
        <Routes>
          <Route
            path="/admin/*"
            element={
              <AdminProtectedRoute>
                <p>Private admin screen</p>
              </AdminProtectedRoute>
            }
          />
          <Route path="/admin/login" element={<p>Admin login screen</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Admin login screen")).toBeInTheDocument();
    expect(screen.queryByText("Private admin screen")).not.toBeInTheDocument();
  });
});

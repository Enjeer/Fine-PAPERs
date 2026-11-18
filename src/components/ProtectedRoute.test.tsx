import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "@/lib/auth-context";

vi.mock("@/lib/auth-context", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <p>Admin screen</p>
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<p>Sign in</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps an authenticated session on the protected route", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "user-uuid", email: "admin@example.test", user_name: "admin" },
      isLoading: false,
      sessionError: null,
      restoreSession: vi.fn(),
      login: vi.fn(),
      signUp: vi.fn(),
      logout: vi.fn(),
      loginWithGoogle: vi.fn(),
    });

    renderProtectedRoute();
    expect(screen.getByText("Admin screen")).toBeInTheDocument();
  });

  it("redirects an unauthenticated user to sign in", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      sessionError: null,
      restoreSession: vi.fn(),
      login: vi.fn(),
      signUp: vi.fn(),
      logout: vi.fn(),
      loginWithGoogle: vi.fn(),
    });

    renderProtectedRoute();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.queryByText("Admin screen")).not.toBeInTheDocument();
  });

  it("does not render a protected page while auth is being restored", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      sessionError: null,
      restoreSession: vi.fn(),
      login: vi.fn(),
      signUp: vi.fn(),
      logout: vi.fn(),
      loginWithGoogle: vi.fn(),
    });

    renderProtectedRoute();
    expect(screen.queryByText("Admin screen")).not.toBeInTheDocument();
    expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
  });
});

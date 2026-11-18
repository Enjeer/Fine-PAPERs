import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { getAdminProfile } from "@/lib/admin-api";

vi.mock("@/lib/admin-auth-context", () => ({
  useAdminAuth: () => ({
    logout: vi.fn(),
  }),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminProfile: vi.fn(),
}));

describe("AdminLayout", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a clear access-denied state when the server returns 403", async () => {
    vi.mocked(getAdminProfile).mockRejectedValue({
      isAxiosError: true,
      response: { status: 403 },
    });

    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false } },
          })
        }
      >
        <MemoryRouter>
          <AdminLayout />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Нет административных прав")).toBeInTheDocument();
  });
});

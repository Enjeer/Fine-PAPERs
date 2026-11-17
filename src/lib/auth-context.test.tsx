import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth-context";

const { apiGet, apiPost } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("./axios", () => ({
  api: {
    get: apiGet,
    post: apiPost,
  },
}));

function CurrentUser() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p>Restoring session</p>;
  return <p>{user?.user_name ?? "Signed out"}</p>;
}

describe("AuthProvider session restoration", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("refreshes the access token and loads the current user before rendering", async () => {
    apiPost.mockResolvedValue({ data: { access: "restored-access" } });
    apiGet.mockResolvedValue({
      data: {
        id: "user-uuid",
        user_name: "restored-user",
        email: "restored@example.test",
      },
    });

    render(
      <AuthProvider>
        <CurrentUser />
      </AuthProvider>,
    );

    expect(await screen.findByText("restored-user")).toBeInTheDocument();
    expect(apiPost).toHaveBeenCalledWith("token/refresh/");
    expect(apiGet).toHaveBeenCalledWith("me/");
  });
});

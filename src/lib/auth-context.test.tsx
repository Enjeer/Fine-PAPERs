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
  const { user, isLoading, sessionError } = useAuth();
  if (isLoading) return <p>Restoring session</p>;
  if (sessionError) return <p role="alert">{sessionError}</p>;
  return <p>{user?.user_name ?? "Signed out"}</p>;
}

describe("AuthProvider session restoration", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.removeItem("ab_user");
  });

  it("refreshes the access token and loads the current user before rendering", async () => {
    localStorage.setItem(
      "ab_user",
      JSON.stringify({
        id: "smoke-id",
        user_name: "storage-smoke-owner",
        email: "storage-smoke-owner@example.invalid",
      }),
    );
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

    expect(screen.getByText("Restoring session")).toBeInTheDocument();
    expect(screen.queryByText("storage-smoke-owner")).not.toBeInTheDocument();
    expect(await screen.findByText("restored-user")).toBeInTheDocument();
    expect(screen.queryByText("storage-smoke-owner")).not.toBeInTheDocument();
    expect(apiPost).toHaveBeenCalledWith("token/refresh/");
    expect(apiGet).toHaveBeenCalledWith("me/");
  });

  it("shows a profile restoration error instead of a cached identity", async () => {
    localStorage.setItem(
      "ab_user",
      JSON.stringify({ user_name: "storage-smoke-owner" }),
    );
    apiPost.mockResolvedValue({ data: { access: "restored-access" } });
    apiGet.mockRejectedValue(new Error("Profile unavailable"));

    render(
      <AuthProvider>
        <CurrentUser />
      </AuthProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Не удалось загрузить профиль",
    );
    expect(screen.queryByText("storage-smoke-owner")).not.toBeInTheDocument();
  });
});

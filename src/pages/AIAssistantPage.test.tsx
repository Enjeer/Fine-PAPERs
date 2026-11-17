import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AIAssistantPage from "./AIAssistantPage";
import { api } from "@/lib/axios";

const { refreshProjects } = vi.hoisted(() => ({
  refreshProjects: vi.fn(),
}));

vi.mock("@/lib/axios", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

vi.mock("@/lib/projects-context", () => ({
  useProjects: () => ({
    getProject: () => undefined,
    refreshProjects,
  }),
}));

describe("AIAssistantPage recovery", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("restores and polls a queued operation returned by the backend", async () => {
    vi.useFakeTimers();
    const operation = {
      id: "operation-1",
      task_type: "structure",
      status: "queued",
      result: {},
      error: "",
      reserved_tokens: 5,
      charged_tokens: 0,
    };
    const response = (data: unknown) =>
      ({ data }) as Awaited<ReturnType<typeof api.get>>;
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === "ai/account/") {
        return response({
          balance: 25,
          plan: { code: "free", name: "Free", features: [] },
        });
      }
      if (url === "ai/operations/operation-1/") {
        return response({ ...operation, status: "running" });
      }
      return response({
          id: "pipeline-1",
          status: "generating_structure",
          requirements: { topic: "Test topic" },
          structure: [],
          subsections: [],
          content_plan: [],
          confirmed_steps: [],
          last_error: "",
          operations: [operation],
          versions: [],
        });
    });

    render(
      <MemoryRouter initialEntries={["/projects/project-1/assistant"]}>
        <Routes>
          <Route
            path="/projects/:projectId/assistant"
            element={<AIAssistantPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText(/Операция ожидает worker/)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(api.get).toHaveBeenCalledWith("ai/operations/operation-1/");
    expect(screen.getByText(/AI выполняет операцию/)).toBeInTheDocument();
  });
});

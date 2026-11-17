import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getActiveOperation,
  startOperationPolling,
  type PollableOperation,
} from "./ai-operation-polling";

type TestOperation = PollableOperation & { error?: string };

describe("AI operation polling", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("restores the latest queued or running operation from pipeline data", () => {
    const queued: TestOperation = { id: "queued", status: "queued" };
    const pipelineOperations: TestOperation[] = [
      { id: "complete", status: "succeeded" },
      queued,
      { id: "older-running", status: "running" },
    ];

    expect(getActiveOperation(pipelineOperations)).toBe(queued);
    expect(getActiveOperation([{ id: "done", status: "succeeded" }])).toBeNull();
  });

  it("retries temporary polling errors serially and stops at terminal status", async () => {
    vi.useFakeTimers();
    const running: TestOperation = { id: "operation-1", status: "running" };
    const succeeded: TestOperation = {
      id: "operation-1",
      status: "succeeded",
    };
    const fetchOperation = vi
      .fn<() => Promise<TestOperation>>()
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(running)
      .mockResolvedValueOnce(succeeded);
    const onUpdate = vi.fn();
    const onError = vi.fn();
    const onComplete = vi.fn();

    const stop = startOperationPolling({
      operationId: "operation-1",
      fetchOperation,
      onUpdate,
      onError,
      onComplete,
    });

    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchOperation).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2999);
    expect(fetchOperation).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchOperation).toHaveBeenCalledTimes(2);
    expect(onUpdate).toHaveBeenCalledWith(running);

    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchOperation).toHaveBeenCalledTimes(3);
    expect(onUpdate).toHaveBeenLastCalledWith(succeeded);
    expect(onComplete).toHaveBeenCalledWith(succeeded);

    await vi.advanceTimersByTimeAsync(10000);
    expect(fetchOperation).toHaveBeenCalledTimes(3);
    stop();
  });

  it("cancels the scheduled poll when the page unmounts", async () => {
    vi.useFakeTimers();
    const fetchOperation = vi.fn<() => Promise<TestOperation>>();
    const stop = startOperationPolling({
      operationId: "operation-2",
      fetchOperation,
      onUpdate: vi.fn(),
      onError: vi.fn(),
    });

    stop();
    await vi.advanceTimersByTimeAsync(5000);

    expect(fetchOperation).not.toHaveBeenCalled();
  });
});

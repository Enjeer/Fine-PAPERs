export type PollableOperationStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface PollableOperation {
  id: string;
  status: PollableOperationStatus;
}

const ACTIVE_STATUSES: PollableOperationStatus[] = ["queued", "running"];
const TERMINAL_STATUSES: PollableOperationStatus[] = [
  "succeeded",
  "failed",
  "cancelled",
];

export function getActiveOperation<T extends PollableOperation>(
  operations: readonly T[],
): T | null {
  return operations.find((operation) =>
    ACTIVE_STATUSES.includes(operation.status),
  ) ?? null;
}

interface OperationPollingOptions<T extends PollableOperation> {
  operationId: string;
  fetchOperation: (id: string) => Promise<T>;
  onUpdate: (operation: T) => void;
  onError: (error: unknown) => void;
  onComplete?: (operation: T) => void | Promise<void>;
  intervalMs?: number;
  retryIntervalMs?: number;
}

export function startOperationPolling<T extends PollableOperation>({
  operationId,
  fetchOperation,
  onUpdate,
  onError,
  onComplete,
  intervalMs = 1500,
  retryIntervalMs = 3000,
}: OperationPollingOptions<T>): () => void {
  let active = true;
  let timer: number | undefined;

  const schedule = (delay: number) => {
    timer = window.setTimeout(() => {
      void poll();
    }, delay);
  };

  const poll = async () => {
    let operation: T;
    try {
      operation = await fetchOperation(operationId);
    } catch (error) {
      if (!active) return;
      onError(error);
      schedule(retryIntervalMs);
      return;
    }

    if (!active) return;
    onUpdate(operation);
    if (TERMINAL_STATUSES.includes(operation.status)) {
      if (onComplete) {
        try {
          await onComplete(operation);
        } catch (error) {
          onError(error);
        }
      }
      return;
    }
    schedule(intervalMs);
  };

  schedule(intervalMs);
  return () => {
    active = false;
    if (timer !== undefined) window.clearTimeout(timer);
  };
}

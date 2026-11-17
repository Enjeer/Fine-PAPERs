import { api } from "@/lib/axios";
import { getSupportCategories } from "@/lib/support-api";

export { getSupportCategories };

export interface SupportUser {
  id: string;
  user_name: string;
}

export interface SupportAttachment {
  id: string;
  filename: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
}

export interface SupportMessage {
  id: string;
  author: SupportUser;
  text: string;
  is_internal: boolean;
  created_at: string;
}

export interface SupportStatusEvent {
  id: string;
  previous_status: string;
  new_status: string;
  actor: SupportUser | null;
  reason: string;
  created_at: string;
}

export interface SupportAssignmentEvent {
  id: string;
  previous_assignee: SupportUser | null;
  new_assignee: SupportUser | null;
  actor: SupportUser | null;
  reason: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user: SupportUser;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignee: SupportUser | null;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  message_count: number;
  messages: SupportMessage[];
  attachments: SupportAttachment[];
  status_history?: SupportStatusEvent[];
  assignment_history?: SupportAssignmentEvent[];
}

export interface SupportAssignee {
  id: string;
  user_name: string;
}

export interface SupportQueueResponse {
  count: number;
  next: string | null;
  previous: string | null;
  summary: {
    new_count: number;
    waiting_for_support_count: number;
    category_counts: Record<string, number>;
    unspecified_category_count: number;
  };
  results: SupportQueueTicket[];
}

export type SupportQueueTicket = Omit<
  SupportTicket,
  "description" | "resolved_at" | "closed_at" | "messages" | "attachments" | "status_history" | "assignment_history"
>;

export interface SupportQueueParams {
  search: string;
  status: string;
  category: string;
  assignee: string;
  ordering: "created_at" | "-created_at" | "last_message_at" | "-last_message_at";
  page: number;
}

export async function getSupportQueue(params: SupportQueueParams) {
  const response = await api.get<SupportQueueResponse>("admin/support/tickets/", {
    params,
  });
  return response.data;
}

export async function getSupportTicket(ticketId: string) {
  const response = await api.get<SupportTicket>(`admin/support/tickets/${ticketId}/`);
  return response.data;
}

export async function getSupportAssignees() {
  const response = await api.get<SupportAssignee[]>("admin/support/assignees/");
  return response.data;
}

export async function sendSupportReply(
  ticketId: string,
  text: string,
  idempotencyKey: string,
) {
  const response = await api.post<SupportMessage>(
    `admin/support/tickets/${ticketId}/messages/`,
    { text },
    { headers: { "Idempotency-Key": idempotencyKey } },
  );
  return response.data;
}

export async function addSupportNote(
  ticketId: string,
  text: string,
  idempotencyKey: string,
) {
  const response = await api.post<SupportMessage>(
    `admin/support/tickets/${ticketId}/notes/`,
    { text },
    { headers: { "Idempotency-Key": idempotencyKey } },
  );
  return response.data;
}

export async function updateSupportStatus(
  ticketId: string,
  status: string,
  reason: string,
) {
  const response = await api.post<SupportTicket>(
    `admin/support/tickets/${ticketId}/status/`,
    { status, reason },
  );
  return response.data;
}

export async function assignSupportTicket(ticketId: string, assigneeId: string) {
  const response = await api.post<SupportTicket>(
    `admin/support/tickets/${ticketId}/assignment/`,
    { assignee_id: assigneeId || null },
  );
  return response.data;
}

export async function downloadSupportAttachment(
  ticketId: string,
  attachment: SupportAttachment,
) {
  const response = await api.get<Blob>(
    `support/tickets/${ticketId}/attachments/${attachment.id}/`,
    { responseType: "blob" },
  );
  const objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = attachment.filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

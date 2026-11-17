import { api } from "@/lib/axios";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  payload: { ticket_id?: string };
  route: string;
  created_at: string;
  read_at: string | null;
}

export interface NotificationPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: AppNotification[];
}

export async function getNotifications() {
  const response = await api.get<NotificationPage>("notifications/", {
    params: { page_size: 20 },
  });
  return response.data;
}

export async function getUnreadNotificationCount() {
  const response = await api.get<{ count: number }>(
    "notifications/unread-count/",
  );
  return response.data.count;
}

export async function markNotificationRead(notificationId: string) {
  const response = await api.post<AppNotification>(
    `notifications/${notificationId}/read/`,
  );
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await api.post<{ updated: number }>(
    "notifications/read-all/",
  );
  return response.data;
}

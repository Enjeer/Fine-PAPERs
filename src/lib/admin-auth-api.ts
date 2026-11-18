import axios from "axios";
import { API_BASE_URL } from "@/config";

type AdminSession = {
  authenticated: boolean;
  username: string;
};

const adminApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
let csrfToken: string | null = null;

adminApi.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event("platform-admin-session-expired"));
    }
    return Promise.reject(error);
  },
);

export async function getAdminSession() {
  const response = await adminApi.get<AdminSession>("admin/auth/session/");
  return response.data;
}

export async function loginAdmin(username: string, password: string) {
  const csrfResponse = await adminApi.get<{ csrfToken: string }>(
    "admin/auth/csrf/",
  );
  csrfToken = csrfResponse.data.csrfToken;
  const response = await adminApi.post<AdminSession>("admin/auth/login/", {
    username,
    password,
  }, {
    headers: { "X-CSRFToken": csrfToken },
  });
  return response.data;
}

export async function logoutAdmin() {
  const csrfResponse = await adminApi.get<{ csrfToken: string }>(
    "admin/auth/csrf/",
  );
  csrfToken = csrfResponse.data.csrfToken;
  await adminApi.post(
    "admin/auth/logout/",
    {},
    { headers: { "X-CSRFToken": csrfToken } },
  );
}

export function adminApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return error instanceof Error ? error.message : "Не удалось выполнить запрос.";
}

export { adminApi };

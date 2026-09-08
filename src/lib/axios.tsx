import axios from "axios";
import { API_BASE_URL } from "@/config";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from "./token-store";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}token/refresh/`,
          {},
          {
            withCredentials: true,
          },
        );

        const newAccess = refreshResponse.data.access;

        setAccessToken(newAccess);

        originalRequest.headers["Authorization"] = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearAccessToken();
        localStorage.removeItem("ab_user");
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

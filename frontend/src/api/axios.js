// src/api/axios.js
import axios from "axios";
import { refreshToken, logout } from "./auth";

// Create API client
const api = axios.create({
  baseURL: "http://localhost:8000/api",
  withCredentials: true, // important if JWT is in HttpOnly cookie
});

// Attach JWT token from localStorage (if any)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // fallback for Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("auth/login") &&
      !originalRequest.url.includes("auth/refresh")
    ) {
      originalRequest._retry = true;
      try {
        const newToken = await refreshToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest); // retry original request
        } else {
          logout();
        }
      } catch (e) {
        logout();
      }
    }

    return Promise.reject(error);
  }
);

export default api;

import axios from "axios";
import { refreshToken, logout } from "./auth";

// Create axios client instance
const client = axios.create({
  baseURL: "http://localhost:8000/api",
});

// Request interceptor: attach access token
client.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: auto-refresh token if expired
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only retry once
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const newToken = await refreshToken(); // refreshToken now always tries to refresh if refresh_token exists
      if (newToken) {
        // Save new token to localStorage
        localStorage.setItem("access_token", newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return client(originalRequest); // retry original request
      } else {
        // If refresh fails, logout
        logout();
      }
    }

    return Promise.reject(error);
  }
);

export default client;

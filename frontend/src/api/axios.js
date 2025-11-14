// frontend/src/api/axios.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// This is a simple logout function to be called on critical errors
export function simpleLogout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("shop");
  // We can't clear the httpOnly refresh token, but the server will reject it
  window.location.href = "/login";
}

const client = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // This is crucial to send cookies (like the refresh_token)
});

// Request Interceptor: Attach the access token to every request
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 errors and attempt to refresh the token
client.interceptors.response.use(
  (response) => response, // Pass through successful responses
  async (error) => {
    const originalRequest = error.config;

    // Check if it's a 401, not a retry, AND not the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/auth/refresh/" // <-- THE FIX IS HERE
    ) {
      originalRequest._retry = true; // Mark as retried

      try {
        // Attempt to refresh the token.
        const res = await client.post("/auth/refresh/");

        if (res.data.access) {
          // Refresh successful
          const newAccessToken = res.data.access;
          localStorage.setItem("access_token", newAccessToken);

          // Update the client's default headers
          client.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          
          // Update the original request's header
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          
          // Retry the original request with the new token
          return client(originalRequest);
        }
      } catch (refreshError) {
        // If the refresh request itself fails, log the user out.
        // This catch block will now correctly fire.
        console.error("Token refresh failed, logging out.", refreshError);
        simpleLogout();
        return Promise.reject(refreshError);
      }
    }

    // For all other errors (or if retry failed), reject the promise
    return Promise.reject(error);
  }
);

export default client;
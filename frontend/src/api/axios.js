// frontend/src/api/axios.js
import axios from "axios";
import { logout } from "./auth"; // Import the logout function

// NOTE: Use your environment-specific URL
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// --- THIS IS THE CRITICAL PART ---
// Request Interceptor: Attach the token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- THIS EXPLAINS THE LOGOUT ---
// Response Interceptor: Handle 401 Unauthorized errors
api.interceptors.response.use(
  (response) => {
    // If the request was successful, just return the response
    return response;
  },
  (error) => {
    // Check if the error is a 401 (Unauthorized)
    if (error.response && error.response.status === 401) {
      // Don't logout on token refresh failure, as it might create a loop
      if (error.config.url.includes("/token/refresh/")) {
        return Promise.reject(error);
      }
      
      // For any other 401, the token is bad, so log the user out
      console.error("Unauthorized request. Logging out.");
      logout();
    }
    
    // Return any other errors
    return Promise.reject(error);
  }
);

export default api;
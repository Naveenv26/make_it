// frontend/src/api/auth.js
import axios from "axios";
// Import the default client for most requests
import client from "./client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Create a separate, basic axios instance *just for refreshing the token*
// This is to avoid an interceptor loop if the refresh token itself is bad.
const axiosForRefresh = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});


// Login user
export async function login(email, password) {
  // Use the default client for logging in
  const res = await client.post(`/token/`, { email: email, password });
  
  if (res.data.access) {
    localStorage.setItem("access_token", res.data.access);
    // Note: The refresh token is set as an httpOnly cookie by the backend
  }
  return res.data;
}

// --- NEW: Implemented Refresh Token Logic ---
export const refreshToken = async () => {
  try {
    // Send the httpOnly cookie to the refresh endpoint
    const res = await axiosForRefresh.post("/auth/refresh/", {}, {
      withCredentials: true, // This is crucial!
    });
    
    if (res.data.access) {
      localStorage.setItem("access_token", res.data.access);
      return res.data.access;
    }
  } catch (err) {
    console.error("Failed to refresh token", err);
    logout(); // If refresh fails, log the user out
    return null;
  }
};


// Signup user + shop
export async function registerUser(data) {
  const payload = {
    name: data.shopName,
    address: data.shopAddress || "",
    contact_phone: data.mobile || "",
    contact_email: data.email, 

    // Owner fields
    owner_email: data.email,
    owner_password: data.password,

    create_shopkeeper: false,
  };

  // Use the default client
  const res = await client.post(`/register-shop/`, payload);
  return res.data;
}

// Forgot password
export async function forgotPassword(email) {
  const res = await client.post(`/auth/forgot-password/`, { email });
  return res.data;
}

// Reset password
export async function resetPassword(uidb64, token, password, password2) {
  const res = await client.post(`/auth/reset-password/${uidb64}/${token}/`, {
    password: password,
    password2: password2,
  });
  return res.data;
}

// Logout
export function logout() {
  // Try to invalidate the token on the backend
  // We don't care much if it fails, we're clearing local storage anyway
  client.post("/auth/logout/", {}, { withCredentials: true }).catch(() => {});

  localStorage.removeItem("access_token");
  // We can't remove the httpOnly cookie, but it will be invalid
  localStorage.removeItem("shop"); 
  window.location.href = "/login";
}

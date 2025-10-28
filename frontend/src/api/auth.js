// frontend/src/api/auth.js
import axios from "axios";

// NOTE: Use your environment-specific URL, not hardcoded
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Reusable axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Login user
export async function login(email, password) {
  // --- THIS IS THE FIX ---
  // Change 'username: email' to 'email: email'
  const res = await api.post(`/token/`, { email: email, password });
  // -----------------------

  if (res.data.access) {
    localStorage.setItem("access_token", res.data.access);
    localStorage.setItem("refresh_token", res.data.refresh);
  }
  return res.data;
}

// Signup user + shop
export async function registerUser(data) {
  const payload = {
    name: data.shopName,
    address: data.shopAddress || "",
    contact_phone: data.mobile || "",
    contact_email: data.email, // This is the shop's contact email

    // Owner fields
    owner_email: data.email, // This is the user's login email
    owner_password: data.password,

    // Optional shopkeeper (as defined in serializer)
    create_shopkeeper: false,
  };

  const res = await api.post(`/register-shop/`, payload);
  return res.data;
}

// Forgot password
export async function forgotPassword(email) {
  const res = await api.post(`/forgot-password/`, { email });
  return res.data;
}

// Reset password
export async function resetPassword(uidb64, token, password, password2) {
  const res = await api.post(`/reset-password/${uidb64}/${token}/`, {
    password: password,
    password2: password2,
  });
  return res.data;
}

// Logout
export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("shop"); 
  window.location.href = "/login";
}

// Temporary stub if you don't have refresh logic yet
export const refreshToken = async () => {
  console.log("refreshToken called (stub)");
  return null;
};
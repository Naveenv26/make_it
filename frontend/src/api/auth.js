// src/api/auth.js
import axios from "axios";

const API_BASE = "http://localhost:8000/api";

// Reusable axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Login user
export async function login(email, password) {
  const res = await api.post(`/token/`, { username: email, password });
  if (res.data.access) {
    localStorage.setItem("access_token", res.data.access);
    localStorage.setItem("refresh_token", res.data.refresh);
  }
  return res.data;
}

// Signup user + shop
export async function registerUser(data) {
  // Payload format expected by backend
  const payload = {
    shop: {
      name: data.shopName,
      address: data.shopAddress,
      contact_phone: data.mobile,
      contact_email: data.email,
      gstin: data.gstin || "",
    },
    owner: {
      username: data.email, // using email as username
      password: data.password,
      email: data.email,
    },
    create_shopkeeper: false,
  };
  const res = await api.post(`/register/`, payload);
  return res.data;
}

// Forgot password (sends OTP to email)
export async function forgotPassword(email) {
  const res = await api.post(`/forgot-password/`, { email });
  return res.data;
}

// Verify OTP and reset password
export async function resetPassword(email, otp, new_password) {
  const res = await api.post(`/reset-password/`, {
    email,
    otp,
    new_password,
  });
  return res.data;
}

// Logout
export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/login";
}



// Temporary stub if you don't have refresh logic yet
export const refreshToken = async () => {
  console.log("refreshToken called (stub)");
  return null;
};
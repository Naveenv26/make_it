// frontend/src/api/auth.js
import client, { simpleLogout } from "./axios"; // <-- Import new unified client and logout

// Login user
export async function login(email, password) {
  // Use the unified client for logging in
  const res = await client.post(`/token/`, { email: email, password });
  
  if (res.data.access) {
    localStorage.setItem("access_token", res.data.access);
    // Note: The refresh token is set as an httpOnly cookie by the backend
    
    // --- 💡 NEW: Fire a custom event to tell the app to refresh contexts ---
    window.dispatchEvent(new Event('login-success'));
  }
  return res.data;
}

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

  // Use the unified client
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
  client.post("/auth/logout/").catch(() => {});

  // Call the centralized logout function
  simpleLogout();
}
// frontend/src/App.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { SubscriptionProvider } from "./context/SubscriptionContext";
import SubscriptionModal from "./pages/Subscription"; // <-- 1. Import the modal

export default function App() {
  return (
    <SubscriptionProvider>
      {/* Add Toaster for notifications */}
      <Toaster position="bottom-right" toastOptions={{
        duration: 4000,
        style: {
          background: '#333',
          color: '#fff',
        },
      }} />
      
      {/* This Outlet renders the current route (e.g., Layout + Billing) */}
      <Outlet />

      {/* --- 2. Render the modal HERE --- */}
      {/* It will be hidden by default and shown by the context */}
      <SubscriptionModal />
      
    </SubscriptionProvider>
  );
}
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import { Toaster } from "react-hot-toast"; // Import Toaster

// Import all pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Stock from "./pages/Stock";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
// Subscription is now a modal, not a page
import ShopSetup from "./pages/ShopSetup";

// Import common components
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";

// --- IMPORT THE NEW PROVIDER ---
import { SubscriptionProvider } from "./context/SubscriptionContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* --- WRAP APP IN THE PROVIDER --- */}
    <SubscriptionProvider>
      <BrowserRouter>
        {/* Add Toaster for notifications */}
        <Toaster position="bottom-right" toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }} />

        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes (with Layout) */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <PrivateRoute>
                <Layout>
                  <Billing />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/stock"
            element={
              <PrivateRoute>
                <Layout>
                  <Stock />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <Layout>
                  <Reports />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Layout>
                  <Settings />
                </Layout>
              </PrivateRoute>
            }
          />

          {/* Protected routes (WITHOUT Layout) */}
          <Route
            path="/setup-shop"
            element={
              <PrivateRoute>
                <ShopSetup />
              </PrivateRoute>
            }
          />

          {/* Default route → dashboard if logged in */}
          <Route path="/" element={<Navigate to="/dashboard" />} />

          {/* Fallback for unknown routes */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </SubscriptionProvider>
  </React.StrictMode>
);

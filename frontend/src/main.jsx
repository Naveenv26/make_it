import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

// Import all pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Stock from "./pages/Stock";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
// We still need Subscription, as it's the modal component
import Subscription from "./pages/Subscription"; 
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
          
          {/* --- REMOVED THE /subscription ROUTE --- */}
          {/* The Subscription component is now rendered inside Layout */}
          
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


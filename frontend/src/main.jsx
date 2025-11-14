// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

// Import the main App layout
import App from "./App"; // <-- Import the new clean App.jsx

// Import all pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Stock from "./pages/Stock";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ShopSetup from "./pages/ShopSetup";

// Import common components
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";

// NOTE: SubscriptionProvider is now in App.jsx

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* This is the main layout route. 
          It renders App.jsx which provides context and the <Outlet />
        */}
        <Route path="/" element={<App />}>
          {/* Public route */}
          <Route path="login" element={<Login />} />

          {/* Protected routes (with Layout) */}
          <Route
            path="dashboard"
            element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="billing"
            element={
              <PrivateRoute>
                <Layout>
                  <Billing />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="stock"
            element={
              <PrivateRoute>
                <Layout>
                  <Stock />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="reports"
            element={
              <PrivateRoute>
                <Layout>
                  <Reports />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="settings"
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
            path="setup-shop"
            element={
              <PrivateRoute>
                <ShopSetup />
              </PrivateRoute>
            }
          />

          {/* Default route → dashboard if logged in */}
          <Route index element={<Navigate to="/dashboard" />} />

          {/* Fallback for unknown routes */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
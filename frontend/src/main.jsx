import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

import ShopSetup from "./pages/ShopSetup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Stock from "./pages/Stock";
import Reports from "./pages/Reports"; 
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute"; // ✅ import

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />
        
        <Route path="/setup-shop" element={<ProtectedRoute><ShopSetup /></ProtectedRoute>} />
        
        {/* Protected routes */}
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
        path="/settings"
        element={
          <PrivateRoute>
            <Layout>
              <Settings />
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

        {/* Default route → dashboard if logged in */}
        <Route path="/" element={<Navigate to="/dashboard" />} />

        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

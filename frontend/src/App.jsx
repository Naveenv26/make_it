import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { me } from "./api/auth";

import AuthPage from "./pages/AuthPage"; // your login/signup UI
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Stock from "./pages/Stock";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import AdminShops from "./pages/AdminShops";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <>
      <Toaster position="top-right" />
      {/* your routes/components */}
    </>
  );
}





export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Page */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <AuthPage />}
        />

        {/* Protected routes */}
          <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
        <Route
          path="/billing"
          element={user ? <Billing /> : <Navigate to="/login" />}
        />
        <Route
          path="/stock"
          element={user ? <Stock /> : <Navigate to="/login" />}
        />

        {/* Owner-only */}
        {user && user.role === "SHOP_OWNER" && (
          <>
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </>
        )}

        {/* Admin-only */}
        {user && user.role === "SITE_ADMIN" && (
          <Route path="/admin/shops" element={<AdminShops />} />
        )}

        {/* Fallback */}
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

// frontend/src/components/Layout.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
import axios from "../api/axios"; // Configured axios instance
import { logout as authLogout } from "../api/auth"; // Logout helper

// --- Import Context & Modal ---
import { useSubscription } from "../context/SubscriptionContext";
import Subscription from "../pages/Subscription";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shopName, setShopName] = useState("Loading...");

  // --- Access Subscription Modal controls ---
  const { openModal } = useSubscription();

  // --- Logout Function ---
  const logout = () => {
    authLogout();
  };

  // --- Fetch User and Shop Info ---
  useEffect(() => {
    axios
      .get("/api/me/")
      .then((res) => {
        const { user, shop } = res.data;

        if (shop) {
          setShopName(shop.name);
          localStorage.setItem("shop", JSON.stringify(shop));
        } else if (user.role === "SHOP_OWNER" || user.role === "SHOPKEEPER") {
          navigate("/setup-shop");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch user data:", err);
        if (err.response && err.response.status === 401) {
          logout();
        }
      });
  }, [navigate]);

  // --- Sidebar Links ---
  const links = [
    { name: "Dashboard", path: "/", icon: "🏠" },
    { name: "Billing", path: "/billing", icon: "🧾" },
    { name: "Reports", path: "/reports", icon: "📊" },
    { name: "Stock", path: "/stock", icon: "📦" },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* --- Sidebar Overlay (Mobile) --- */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* --- Sidebar --- */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-md z-40 transform transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0 lg:static lg:shadow-none`}
      >
        <div className="flex flex-col h-full justify-between">
          <div>
            {/* --- Header / Shop Name --- */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <span className="text-red-600 font-bold text-lg" title={shopName}>
                  {shopName.length > 20
                    ? `${shopName.substring(0, 20)}...`
                    : shopName}
                </span>
              </div>
              {/* Close on mobile */}
              <button
                className="lg:hidden text-gray-500 hover:text-gray-700"
                onClick={() => setSidebarOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            {/* --- Navigation Links --- */}
            <nav className="mt-4 space-y-1 px-4">
              {links.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 transition rounded-lg ${
                      isActive ? "bg-purple-100 text-purple-600 font-medium" : ""
                    }`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="mr-3">{link.icon}</span>
                  {link.name}
                </NavLink>
              ))}

              {/* --- Subscription Button --- */}
              <button
                onClick={() => {
                  openModal();
                  setSidebarOpen(false);
                }}
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 transition rounded-lg w-full text-left"
              >
                <span className="mr-3">⭐</span>
                Subscription
              </button>

              {/* --- Settings Link --- */}
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 rounded-lg hover:bg-gray-100 ${
                    isActive ? "bg-gray-200 font-semibold" : ""
                  }`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <span>⚙️ Settings</span>
              </NavLink>
            </nav>
          </div>

          {/* --- Footer --- */}
          <div className="px-6 py-4 border-t">
            <button
              onClick={logout}
              className="w-full text-red-500 hover:text-red-700 font-medium text-left"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <div className="flex-1 flex flex-col transition-all duration-300">
        {/* --- Top Navbar --- */}
        <header className="bg-white shadow px-6 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* --- Hamburger Menu --- */}
            <button
              className="text-gray-700 lg:hidden focus:outline-none"
              onClick={() => setSidebarOpen(true)}
            >
              <FaBars size={20} />
            </button>
            <h1 className="text-lg font-semibold text-gray-700 hidden sm:block">
              Dashboard
            </h1>
          </div>
        </header>

        {/* --- Page Content --- */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      {/* --- Subscription Modal (Hidden by default) --- */}
      <Subscription />
    </div>
  );
}

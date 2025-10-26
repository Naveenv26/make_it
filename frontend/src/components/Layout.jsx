import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
import axios from 'axios';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  useEffect(() => {
  axios.get("/api/shops/")
    .then(res => {
      if (res.data.length === 0) navigate("/setup-shop");
    })
    .catch(err => console.error(err));
}, []);


const links = [
  { name: "Dashboard", path: "/", icon: "🏠" },
  { name: "Billing", path: "/billing", icon: "🧾" },
  { name: "Reports", path: "/reports", icon: "📊" },
  { name: "Stock", path: "/stock", icon: "📦" },
  { name: "Subscription", path: "/subscription", icon: "⭐" }, // ✅ ADD THIS
];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-30 z-30 transition-opacity lg:hidden ${
          sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-md z-40 transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:shadow-none`}
      >
        {/* Inside your sidebar navigation links */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 ${
                isActive ? "bg-gray-200 font-semibold" : ""
              }`
            }
          >
            <span>⚙️ Settings</span>
          </NavLink>

        <div className="flex flex-col h-full justify-between">
          <div>
            {/* Logo */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <span className="text-red-600 font-bold text-lg">Billing App</span>
                <span className="text-sm text-gray-500 ml-1">— Customer</span>
              </div>
              {/* Close icon on mobile */}
              <button
                className="lg:hidden text-gray-500 hover:text-gray-700"
                onClick={() => setSidebarOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            {/* Navigation */}
            <nav className="mt-4 space-y-1">
              {links.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 transition ${
                      isActive ? "bg-purple-100 text-purple-600 font-medium" : ""
                    }`
                  }
                  onClick={() => setSidebarOpen(false)} // Close on mobile after click
                >
                  <span className="mr-3">{link.icon}</span>
                  {link.name}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t text-xs text-gray-400">
            © 2025 Sparkzen Billing
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col transition-all duration-300">
        {/* Top Navbar */}
        <header className="bg-white shadow px-6 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* Hamburger button for mobile */}
            <button
              className="text-gray-700 lg:hidden focus:outline-none"
              onClick={() => setSidebarOpen(true)}
            >
              <FaBars size={20} />
            </button>
            <h1 className="text-lg font-semibold text-gray-700 hidden sm:block">Dashboard</h1>
          </div>

          <button
            onClick={logout}
            className="text-red-500 hover:text-red-700 font-medium"
          >
            Logout
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

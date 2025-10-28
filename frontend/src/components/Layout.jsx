// frontend/src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
import api from '../api/axios'; // <-- Import your configured axios instance
import { logout as authLogout } from '../api/auth'; // <-- Import your logout function

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shopName, setShopName] = useState("Loading..."); // <-- State for shop name

  const logout = () => {
    authLogout(); // <-- Use the imported logout function
  };

  useEffect(() => {
    // Fetch user and shop data when layout loads
    api.get("/me/")
      .then(res => {
        const { user, shop } = res.data;
        
        if (shop) {
          setShopName(shop.name);
          // Store shop data in localStorage for other pages (like Billing.jsx)
          localStorage.setItem("shop", JSON.stringify(shop));
        } else if (user.role === 'SHOP_OWNER' || user.role === 'SHOPKEEPER') {
          // User is a shop user but has no shop assigned (e.g., setup needed)
          navigate("/setup-shop");
        }
      })
      .catch(err => {
        console.error("Failed to fetch user data:", err);
        if (err.response && err.response.status === 401) {
           logout(); // Token is invalid, force logout
        }
      });
  }, [navigate]);


  const links = [
    { name: "Dashboard", path: "/", icon: "🏠" },
    { name: "Billing", path: "/billing", icon: "🧾" },
    { name: "Reports", path: "/reports", icon: "📊" },
    { name: "Stock", path: "/stock", icon: "📦" },
    { name: "Subscription", path: "/subscription", icon: "⭐" },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {/* ... (no change) ... */}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-md z-40 transform transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:shadow-none`}
      >
        <div className="flex flex-col h-full justify-between">
          <div>
            {/* Logo */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                {/* --- UPDATED: Show Shop Name --- */}
                <span className="text-red-600 font-bold text-lg" title={shopName}>
                  {shopName.length > 20 ? `${shopName.substring(0, 20)}...` : shopName}
                </span>
                {/* <span className="text-sm text-gray-500 ml-1">— Customer</span> */}
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
            <nav className="mt-4 space-y-1 px-4"> {/* Added px-4 for padding */}
              {links.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 transition rounded-lg ${ // Added rounded-lg
                      isActive ? "bg-purple-100 text-purple-600 font-medium" : ""
                    }`
                  }
                  onClick={() => setSidebarOpen(false)} // Close on mobile after click
                >
                  <span className="mr-3">{link.icon}</span>
                  {link.name}
                </NavLink>
              ))}
              {/* --- MOVED Settings link here --- */}
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 rounded-lg hover:bg-gray-100 ${
                    isActive ? "bg-gray-200 font-semibold" : ""
                  }`
                }
              >
                <span>⚙️ Settings</span>
              </NavLink>
            </nav>
          </div>

          {/* Footer */}
          {/* ... (no change) ... */}
        </div>
      </aside>

      {/* Main content */}
      {/* ... (no change in main content wrapper or header) ... */}
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
import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
import api from "../api/axios"; // Real axios
import { logout as authLogout } from "../api/auth"; // Real auth
import { useSubscription } from "../context/SubscriptionContext"; // Real context
import Subscription from "../pages/Subscription"; // Real component

export default function Layout({ children }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shopName, setShopName] = useState("Loading...");

  // --- Access Subscription Modal controls ---
  const {
    isSubscribed, // This is the boolean `is_valid`
    openModal, // Use openModal from context
    subscription,
    isLoading: isSubscriptionLoading,
  } = useSubscription(); // This now uses the REAL hook

  // --- ✨ GEMINI API STATES ---
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [tipContent, setTipContent] = useState("");
  const [isTipLoading, setIsTipLoading] = useState(false);

  // --- Logout Function ---
  const logout = () => {
    authLogout(); // Uses real function
  };

  // --- Fetch User and Shop Info ---
  useEffect(() => {
    api // Uses real api
      .get("/me/")
      .then((res) => {
        const { user, shop } = res.data;

        if (shop) {
          setShopName(shop.name);
          localStorage.setItem("shop", JSON.stringify(shop)); // Set shop in local storage
        } else if (user.role === "SHOP_OWNER" || user.role === "SHOPKEEPER") {
          navigate("/setup-shop"); // Uses real navigate
        }
      })
      .catch((err) => {
        console.error("Failed to fetch user data:", err);
        if (err.response && err.response.status === 401) {
          logout();
        }
      });
  }, [navigate]);

  // --- ✨ GEMINI API FUNCTIONS ---

  /**
   * Fetches from the Gemini API with exponential backoff for retries.
   */
  const fetchWithBackoff = async (url, options, retries = 3, delay = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        // Check for rate limiting
        if (response.status === 429 && retries > 0) {
          // Wait and retry
          await new Promise((resolve) => setTimeout(resolve, delay));
          return fetchWithBackoff(url, options, retries - 1, delay * 2);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      // Handle network errors
      if (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithBackoff(url, options, retries - 1, delay * 2);
      }
      throw error;
    }
  };

  /**
   * Fetches a business tip from the Gemini API.
   */
  const fetchBusinessTip = async () => {
    setIsTipLoading(true);
    setTipContent("");

    const apiKey = ""; // API key is handled by the environment
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const systemPrompt =
      "You are a world-class business consultant for a small retail POS user. Provide a single, concise, and actionable business tip. Focus on things like inventory management, customer engagement, or upselling. Start the tip directly, without any greeting or intro.";
    const userQuery = "Give me one business tip for my shop today.";

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
    };

    try {
      const result = await fetchWithBackoff(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const candidate = result.candidates?.[0];
      if (candidate && candidate.content?.parts?.[0]?.text) {
        setTipContent(candidate.content.parts[0].text);
      } else {
        throw new Error("No content received from API.");
      }
    } catch (error) {
      console.error("Error fetching business tip:", error);
      setTipContent(
        "Sorry, I couldn't fetch a tip right now. Please try again later."
      );
    } finally {
      setIsTipLoading(false);
    }
  };

  const handleGetTipClick = () => {
    setIsTipModalOpen(true);
    fetchBusinessTip();
  };

  // --- ✨ GEMINI TIP MODAL COMPONENT ---
  const GeminiTipModal = () => {
    if (!isTipModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-purple-600">
              ✨ Daily Business Tip
            </h2>
            <button
              onClick={() => setIsTipModalOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
          </div>

          <div className="min-h-[100px] flex items-center justify-center">
            {isTipLoading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            ) : (
              <p className="text-gray-700">{tipContent}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- Sidebar Links ---
  const links = [
    { name: "Dashboard", path: "/dashboard", icon: "🏠" }, // Changed path
    { name: "Billing", path: "/billing", icon: "🧾" },
    { name: "Reports", path: "/reports", icon: "📊" },
    { name: "Stock", path: "/stock", icon: "📦" },
  ];

  // --- New function for navbar badge ---
  const getTrialBadgeForNav = () => {
    if (isSubscriptionLoading) return null;
    let text = "";
    let baseStyle = "ml-2 text-xs font-semibold px-2 py-0.5 rounded-full";

    if (subscription?.trial_used && !isSubscribed) {
       // Check if trial_end_date is in the past
      const endDate = new Date(subscription.trial_end_date);
      if (endDate < new Date()) {
        text = "Trial Expired";
        return <span className={`${baseStyle} bg-red-100 text-red-700`}>{text}</span>;
      }
      text = `${subscription.days_remaining} days left`;
      return <span className={`${baseStyle} bg-green-100 text-green-700`}>{text}</span>;
    } else if (!isSubscribed) {
      text = "Expired";
      return <span className={`${baseStyle} bg-red-100 text-red-700`}>{text}</span>;
    } else {
      text = subscription?.plan_details?.plan_type || "Active"; // Use plan_type
      return <span className={`${baseStyle} bg-white/20 text-white`}>{text}</span>;
    }
  };


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
        lg:translate-x-0 lg:shadow-none`}
      >
        <div className="flex flex-col h-full justify-between">
          <div>
            {/* --- Header / Shop Name --- */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <span
                  className="text-red-600 font-bold text-lg"
                  title={shopName}
                >
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
                  end={link.path === "/dashboard"} // Exact match for Dashboard
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 transition rounded-lg ${
                      isActive
                        ? "bg-purple-100 text-purple-600 font-medium"
                        : ""
                    }`
                  }
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="mr-3">{link.icon}</span>
                  {link.name}
                </NavLink>
              ))}

              {/* --- ✨ GEMINI FEATURE --- */}
              <button
                onClick={handleGetTipClick}
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-100 transition rounded-lg w-full text-left"
              >
                <span className="mr-3">✨</span>
                Get Daily Tip
              </button>
              {/* --- END GEMINI FEATURE --- */}

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
              {/* This title could be dynamic based on route */}
              SmartBill
            </h1>
          </div>

          {/* --- Subscription Button (New Location) --- */}
          <div>
            <button
              onClick={openModal} // Use context function
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white font-semibold transition-all shadow-md
                ${
                  isSubscribed && !subscription?.trial_used
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    : "bg-gray-700 hover:bg-gray-800"
                }
              `}
            >
              <span>⭐</span>
              <span>
                {!isSubscribed && !subscription?.trial_used
                  ? "Upgrade Plan"
                  : "Subscription"}
              </span>
              {getTrialBadgeForNav()}
            </button>
          </div>
        </header>

        {/* --- Page Content --- */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      {/* --- Subscription Modal (Now a Paywall) --- */}
      {/* This component will render if isModalOpen is true */}
      <Subscription />

      {/* --- ✨ GEMINI MODAL --- */}
      <GeminiTipModal />
    </div>
  );
}

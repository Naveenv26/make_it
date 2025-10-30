import React, { useState, useEffect } from "react";
import client from "../api/client";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../context/SubscriptionContext"; // Import context

export default function Subscription() {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // State for the dropdown
  const [selectedDuration, setSelectedDuration] = useState("MONTHLY"); 
  
  const navigate = useNavigate();

  // --- Get modal controls from context ---
  const { isModalOpen, closeModal } = useSubscription();

  // Your Razorpay Key from .env file
  const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || "YOUR_RAZORPAY_KEY_ID";

  useEffect(() => {
    // Only load data if the modal is opened
    if (isModalOpen) {
      loadData();
    }
  }, [isModalOpen]); // Re-run when modal is opened

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, subRes] = await Promise.all([
        client.get("/subscription-plans/"),
        client.get("/payments/subscription-status/"),
      ]);
      
      // Ensure data is an array
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setSubscription(subRes.data);

    } catch (err) {
      toast.error("Failed to load subscription data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (plan) => {
    if (!plan) {
        toast.error("Please select a valid plan.");
        return;
    }

    setProcessing(true);
    
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error("Failed to load payment gateway");
      setProcessing(false);
      return;
    }

    try {
      // 1. Create order
      const orderRes = await client.post("/payments/create-order/", {
        plan_id: plan.id,
      });

      const { order_id, amount, currency, user_name, user_email } = orderRes.data;

      // 2. Razorpay options
      const options = {
        key: RAZORPAY_KEY,
        amount: amount,
        currency: currency,
        name: "SmartBill Subscription",
        description: `${plan.name} Subscription`,
        order_id: order_id,
        handler: async function (response) {
          try {
            // 3. Verify payment
            const verifyRes = await client.post("/payments/verify-payment/", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data.success) {
              toast.success("🎉 Payment successful! Subscription activated.");
              closeModal(); // Close the modal
              loadData(); // Reload subscription data in background
              setTimeout(() => navigate("/dashboard"), 1000); // Go to dashboard
            }
          } catch (err) {
            toast.error("Payment verification failed");
            console.error(err);
            setProcessing(false);
          }
        },
        prefill: {
          name: user_name,
          email: user_email,
        },
        theme: {
          color: "#4F46E5",
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
            toast.error("Payment cancelled");
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

    } catch (err) {
      toast.error("Failed to create order");
      console.error(err);
      setProcessing(false); // Set processing false if order creation fails
    } 
    // Removed 'finally' block that was incorrectly setting processing to false
  };

  const handleStartTrial = async () => {
    try {
      const res = await client.post("/payments/start-trial/");
      if (res.data.success) {
        toast.success("✅ 7-day free trial activated!");
        loadData();
        setTimeout(() => {
          closeModal();
          navigate("/dashboard");
        }, 2000);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to start trial");
    }
  };

  // --- Find the plans to display ---
  // We find the Basic plans for the dropdown
  const basicPlans = plans.filter((p) => p.plan_type === "BASIC");
  const proPlan = plans.find((p) => p.plan_type === "PRO"); // Just find one 'Pro' plan

  // Find the currently selected Basic plan object
  const selectedBasicPlan = basicPlans.find(p => p.duration === selectedDuration);
  
  // --- Check subscription status ---
  const isTrialActive = subscription?.has_trial;
  const isValid = subscription?.is_valid;
  const planType = subscription?.plan_type;
  // Use optional chaining for safety
  const daysRemaining = subscription?.subscription?.days_remaining;
  const trialUsed = subscription?.subscription?.trial_used;


  // Don't render anything if modal is closed
  if (!isModalOpen) {
    return null; 
  }

  return (
    // Modal container with backdrop blur
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={closeModal} // Close when clicking backdrop
      ></div>

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button 
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="p-6 md:p-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              Subscription
            </h1>
            <p className="text-lg text-gray-600">
              Manage your plan and billing.
            </p>
          </div>

          {/* Current Subscription Status */}
          {loading && (
            <div className="text-center p-6 text-gray-500">Loading status...</div>
          )}

          {!loading && subscription && (
            <div className="mb-8 max-w-2xl mx-auto">
              <div
                className={`p-6 rounded-2xl shadow-lg ${
                  isValid
                    ? "bg-green-50 border-2 border-green-300"
                    : "bg-red-50 border-2 border-red-300"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Current Status
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {isTrialActive && (
                        <span className="text-green-700 font-medium">
                          🎉 Free Trial Active ({daysRemaining} days left)
                        </span>
                      )}
                      {!isTrialActive && isValid && (
                        <span className="text-green-700 font-medium">
                          ✅ {planType} Plan Active ({daysRemaining} days left)
                        </span>
                      )}
                      {!isValid && (
                        <span className="text-red-700 font-medium">
                          ⚠️ No active subscription
                        </span>
                      )}
                    </p>
                  </div>
                  {!isValid && !trialUsed && (
                    <button
                      onClick={handleStartTrial}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold shadow transition w-full sm:w-auto"
                    >
                      Start Free Trial
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* BASIC PLAN */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-indigo-500">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                <h3 className="text-2xl font-bold">Basic Plan</h3>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">Select Duration</label>
                  <select 
                    id="duration"
                    value={selectedDuration}
                    onChange={(e) => setSelectedDuration(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    {basicPlans.map(p => (
                      <option key={p.duration} value={p.duration}>
                        {p.name} (₹{p.price})
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedBasicPlan && (
                  <div className="mt-4 text-center">
                    <span className="text-4xl font-extrabold text-gray-900">₹{selectedBasicPlan.price}</span>
                    <span className="text-lg ml-2 text-gray-600">
                      / {selectedBasicPlan.duration_display.toLowerCase()}
                    </span>
                  </div>
                )}
                
                <ul className="space-y-3 my-6 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-700">Unlimited Billing</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-700">Invoice Management</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-700">Stock Management</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-700">Basic Dashboard & Reports</span>
                  </li>
                </ul>
                <button
                  onClick={() => handleSubscribe(selectedBasicPlan)}
                  disabled={processing || (planType === "BASIC" && isValid)}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    planType === "BASIC" && isValid
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
                  }`}
                >
                  {planType === "BASIC" && isValid
                    ? "Current Plan"
                    : processing
                    ? "Processing..."
                    : "Subscribe to Basic"}
                </button>
              </div>
            </div>

            {/* PRO PLAN (Coming Soon) */}
            <div className="bg-gray-100 rounded-2xl shadow-xl overflow-hidden border-2 border-gray-300 relative">
              <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs px-3 py-1 rounded-full font-bold z-10">
                COMING SOON
              </div>
              <div className="bg-gray-400 p-6 text-white">
                <h3 className="text-2xl font-bold">Pro Plan ⭐</h3>
              </div>
              <div className="p-6 opacity-60">
                 <div className="mt-4 text-center">
                    <span className="text-4xl font-extrabold text-gray-900">₹{proPlan?.price || '...'}</span>
                    <span className="text-lg ml-2 text-gray-600">
                      / month
                    </span>
                  </div>
                
                <ul className="space-y-3 my-6 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 font-bold">✓</span>
                    <span className="text-gray-700 font-medium">Everything in Basic</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 font-bold">✓</span>
                    <span className="text-gray-700 font-medium">Full Reports & Analytics</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 font-bold">✓</span>
                    <span className="text-gray-700 font-medium">Expense Tracking</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 font-bold">✓</span>
                    <span className="text-gray-700 font-medium">GST & Profit/Loss Reports</span>
                  </li>
                </ul>
                <button
                  disabled={true}
                  className="w-full py-3 rounded-lg font-semibold transition bg-gray-300 text-gray-500 cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

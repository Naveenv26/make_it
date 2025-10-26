import React, { useState, useEffect } from "react";
import client from "../api/client";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Subscription() {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || "YOUR_RAZORPAY_KEY_ID";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        client.get("/subscription-plans/"),
        client.get("/payments/subscription-status/"),
      ]);
      setPlans(plansRes.data);
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
    setProcessing(true);
    
    // Load Razorpay SDK
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error("Failed to load payment gateway");
      setProcessing(false);
      return;
    }

    try {
      // Create order
      const orderRes = await client.post("/payments/create-order/", {
        plan_id: plan.id,
      });

      const { order_id, amount, currency, user_name, user_email } = orderRes.data;

      // Razorpay options
      const options = {
        key: RAZORPAY_KEY,
        amount: amount,
        currency: currency,
        name: "Billing App Pro",
        description: `${plan.name} Subscription`,
        order_id: order_id,
        handler: async function (response) {
          try {
            // Verify payment
            const verifyRes = await client.post("/payments/verify-payment/", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data.success) {
              toast.success("🎉 Payment successful! Subscription activated.");
              loadData(); // Reload subscription data
              setTimeout(() => navigate("/dashboard"), 2000);
            }
          } catch (err) {
            toast.error("Payment verification failed");
            console.error(err);
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
    } finally {
      setProcessing(false);
    }
  };

  const handleStartTrial = async () => {
    try {
      const res = await client.post("/payments/start-trial/");
      if (res.data.success) {
        toast.success("✅ 7-day free trial activated!");
        loadData();
        setTimeout(() => navigate("/dashboard"), 2000);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to start trial");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  const isTrialActive = subscription?.has_trial;
  const isValid = subscription?.is_valid;
  const planType = subscription?.plan_type;

  // Group plans by type
  const basicPlans = plans.filter((p) => p.plan_type === "BASIC");
  const proPlans = plans.filter((p) => p.plan_type === "PRO");

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Start with 7-day free trial. No credit card required.
          </p>
        </div>

        {/* Current Subscription Status */}
        {subscription && (
          <div className="mb-8 max-w-2xl mx-auto">
            <div
              className={`p-6 rounded-2xl shadow-lg ${
                isValid
                  ? "bg-green-50 border-2 border-green-300"
                  : "bg-red-50 border-2 border-red-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Current Status
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {isTrialActive && (
                      <span className="text-green-700 font-medium">
                        🎉 Free Trial Active ({subscription.subscription.days_remaining} days left)
                      </span>
                    )}
                    {!isTrialActive && isValid && (
                      <span className="text-green-700 font-medium">
                        ✅ {planType} Plan Active ({subscription.subscription.days_remaining} days left)
                      </span>
                    )}
                    {!isValid && (
                      <span className="text-red-700 font-medium">
                        ⚠️ No active subscription
                      </span>
                    )}
                  </p>
                </div>
                {!isValid && !subscription.subscription.trial_used && (
                  <button
                    onClick={handleStartTrial}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold shadow transition"
                  >
                    Start Free Trial
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* BASIC PLANS */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
              Basic Plan
            </h2>
            {basicPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-200 hover:border-indigo-400 transition"
              >
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                  <h3 className="text-2xl font-bold">{plan.duration_display}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-extrabold">₹{plan.price}</span>
                    <span className="text-lg ml-2">
                      / {plan.duration === "MONTHLY" ? "month" : plan.duration_display.toLowerCase()}
                    </span>
                  </div>
                  {plan.duration !== "MONTHLY" && (
                    <p className="text-sm mt-2 text-indigo-100">
                      ₹{(plan.price / (plan.duration_days / 30)).toFixed(0)}/month
                    </p>
                  )}
                </div>
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
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
                      <span className="text-gray-700">Stock View</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span className="text-gray-700">Basic Dashboard</span>
                    </li>
                    <li className="flex items-start opacity-50">
                      <span className="text-gray-400 mr-2">✗</span>
                      <span className="text-gray-500">Full Reports</span>
                    </li>
                    <li className="flex items-start opacity-50">
                      <span className="text-gray-400 mr-2">✗</span>
                      <span className="text-gray-500">Expense Tracking</span>
                    </li>
                    <li className="flex items-start opacity-50">
                      <span className="text-gray-400 mr-2">✗</span>
                      <span className="text-gray-500">GST Reports</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => handleSubscribe(plan)}
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
                      : "Subscribe Now"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* PRO PLANS */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
              Pro Plan ⭐
            </h2>
            {proPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-purple-400 hover:border-purple-600 transition transform hover:scale-105"
              >
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-bold">{plan.duration_display}</h3>
                    {plan.duration !== "MONTHLY" && (
                      <span className="bg-yellow-400 text-yellow-900 text-xs px-3 py-1 rounded-full font-bold">
                        BEST VALUE
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="text-4xl font-extrabold">₹{plan.price}</span>
                    <span className="text-lg ml-2">
                      / {plan.duration === "MONTHLY" ? "month" : plan.duration_display.toLowerCase()}
                    </span>
                  </div>
                  {plan.duration !== "MONTHLY" && (
                    <p className="text-sm mt-2 text-purple-100">
                      ₹{(plan.price / (plan.duration_days / 30)).toFixed(0)}/month + FREE months!
                    </p>
                  )}
                </div>
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
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
                      <span className="text-gray-700 font-medium">Profit & Loss Reports</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 font-bold">✓</span>
                      <span className="text-gray-700 font-medium">GST Reports</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 font-bold">✓</span>
                      <span className="text-gray-700 font-medium">Export to PDF/Excel</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 font-bold">✓</span>
                      <span className="text-gray-700 font-medium">Low Stock Alerts</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 font-bold">✓</span>
                      <span className="text-gray-700 font-medium">Priority Support</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={processing || (planType === "PRO" && isValid)}
                    className={`w-full py-3 rounded-lg font-semibold transition ${
                      planType === "PRO" && isValid
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                    }`}
                  >
                    {planType === "PRO" && isValid
                      ? "Current Plan"
                      : processing
                      ? "Processing..."
                      : "Upgrade to Pro"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center mt-12">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-center mb-6">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900">What happens after the free trial?</h4>
              <p className="text-gray-600 mt-1">
                After 7 days, you can choose to subscribe to Basic or Pro plan to continue using the app.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Can I cancel anytime?</h4>
              <p className="text-gray-600 mt-1">
                Yes! You can cancel your subscription anytime. You'll have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">What payment methods do you accept?</h4>
              <p className="text-gray-600 mt-1">
                We accept all major credit/debit cards, UPI, and net banking via Razorpay.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Is there a grace period?</h4>
              <p className="text-gray-600 mt-1">
                Yes, you get 3 days grace period after subscription expires before losing access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
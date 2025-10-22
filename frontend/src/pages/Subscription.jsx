// src/pages/Subscription.jsx
import React, { useEffect, useState } from "react";
import axios from "../api/axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Subscription() {
  const [plans, setPlans] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const navigate = useNavigate();

  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [planRes, userRes] = await Promise.all([
          axios.get("/subscription-plans/"),
          axios.get("/me/"),
        ]);
        setPlans(planRes.data);
        setUser(userRes.data);
      } catch (err) {
        console.error("Error fetching subscription data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (plan) => {
    setSubscribing(true);
    const loaded = await loadRazorpay();
    if (!loaded) {
      alert("Failed to load Razorpay SDK. Please check your internet connection.");
      setSubscribing(false);
      return;
    }

    try {
      // Create order/subscription from backend
      const res = await axios.post("/create-subscription/", {
        plan_id: plan.id,
      });

      const { order_id, amount, currency } = res.data;

      const options = {
        key: razorpayKey,
        amount: amount.toString(),
        currency: currency,
        name: "Billing App",
        description: `${plan.name} Plan Subscription`,
        order_id: order_id,
        handler: async function (response) {
          try {
            const verifyRes = await axios.post("/verify-payment/", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data.success) {
              alert("✅ Payment successful! Subscription activated.");
              window.location.reload();
            } else {
              alert("❌ Payment verification failed. Please contact support.");
            }
          } catch (err) {
            console.error("Verification failed:", err);
            alert("❌ Payment verification failed.");
          }
        },
        prefill: {
          name: user?.username || "",
          email: user?.email || "",
        },
        theme: {
          color: "#2563eb",
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error("Subscription error:", err);
      alert("Failed to create subscription. Try again later.");
    } finally {
      setSubscribing(false);
    }
  };

  if (loading)
    return <div className="text-center mt-10 text-gray-500">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Subscription Plans</h1>

      {/* User info */}
      {user && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
          <p className="text-gray-800 font-medium">
            Hello, {user.username || "User"}
          </p>
          {user.is_active_subscription ? (
            <p className="text-green-600 text-sm mt-1">
              ✅ Active Plan: {user.plan_name} — valid till{" "}
              {new Date(user.subscription_valid_till).toLocaleDateString()}
            </p>
          ) : user.is_trial_active ? (
            <p className="text-yellow-700 text-sm mt-1">
              🎉 Trial Active — {user.trial_days_left} days remaining
            </p>
          ) : (
            <p className="text-red-600 text-sm mt-1">
              ⚠️ No active plan. Please subscribe below.
            </p>
          )}
        </div>
      )}

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.length === 0 ? (
          <p className="text-gray-500 col-span-3 text-center">
            No plans available yet.
          </p>
        ) : (
          plans.map((plan) => (
            <Card
              key={plan.id}
              className="hover:shadow-xl transition border border-gray-200"
            >
              <CardContent className="p-5 text-center flex flex-col justify-between h-full">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {plan.name}
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">
                    Valid {plan.duration_days} days
                  </p>
                  <p className="text-2xl font-semibold text-green-600 mt-4">
                    ₹{plan.price}
                  </p>
                </div>

                <Button
                  disabled={subscribing}
                  onClick={() => handleSubscribe(plan)}
                  className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {subscribing ? "Processing..." : "Subscribe"}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Back to Dashboard */}
      <div className="mt-10 text-center">
        <Button
          onClick={() => navigate("/dashboard")}
          className="bg-gray-700 hover:bg-gray-800 text-white"
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

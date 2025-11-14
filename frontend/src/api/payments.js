// frontend/src/api/payments.js
import client from "./axios";

// Get all available subscription plans
export const getSubscriptionPlans = async () => {
  const res = await client.get("/subscription-plans/");
  return res.data;
};

// Create a new Razorpay order
export const createRazorpayOrder = async (planId) => {
  const res = await client.post("/payments/create-order/", { plan_id: planId });
  return res.data;
};

// Verify the payment after Razorpay success
export const verifyRazorpayPayment = async (payload) => {
  // Payload should be { razorpay_order_id, razorpay_payment_id, razorpay_signature }
  const res = await client.post("/payments/verify-payment/", payload);
  return res.data;
};

// --- THIS IS THE MISSING EXPORT ---
export const startFreeTrial = async () => {
  const res = await client.post("/payments/start-trial/");
  return res.data;
};
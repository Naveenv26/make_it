// frontend/src/pages/Subscription.jsx
import React, { useEffect, useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { 
  getSubscriptionPlans, 
  createRazorpayOrder, 
  verifyRazorpayPayment,
  startFreeTrial 
} from '../api/payments';
import useRazorpay from '../hooks/useRazorpay';
import { Check, X, Star, Zap, TrendingUp, Crown, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

// --- Plan Configuration (from seed_plans.py) ---
const iconMap = {
  FREE: Star,
  BASIC: Zap,
  PRO: TrendingUp,
  PREMIUM: Crown,
};

const colorMap = {
  FREE: {
    border: 'border-gray-300',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    button: 'bg-green-600 hover:bg-green-700', // Green for "Start Trial"
    iconBg: 'bg-gray-200',
  },
  BASIC: {
    border: 'border-blue-400',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
    iconBg: 'bg-blue-100',
  },
  PRO: {
    border: 'border-purple-400',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
    iconBg: 'bg-purple-100',
  },
  PREMIUM: {
    border: 'border-amber-400',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700',
    iconBg: 'bg-amber-100',
  },
};

// --- Helper Components ---
const Feature = ({ text, included }) => (
  <li className="flex items-start">
    {included ? (
      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
    ) : (
      <X className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
    )}
    <span className={`text-sm ${included ? 'text-gray-800' : 'text-gray-500'}`}>
      {text}
    </span>
  </li>
);

// --- 💡 MODIFIED PlanCard ---
const PlanCard = ({ plan, currentPlanType, isSubscribed, onSubscribe, onStartTrial, isProcessing, trialUsed }) => {
  const { plan_type = 'FREE', name, price, duration, features, duration_days } = plan;
  const Icon = iconMap[plan_type] || Star;
  const color = colorMap[plan_type] || colorMap.FREE;
  
  // --- THIS IS THE FIX ---
  // A plan is only "Active" if it's the current plan AND the subscription is valid
  const isActive = currentPlanType === plan_type && isSubscribed;
  // --- END FIX ---

  // Dynamically create feature list from the features object
  const featureList = [
    { text: 'Dashboard Access', included: features?.dashboard },
    { text: 'Stock Maintenance', included: features?.stock },
    { text: 'Billing & Invoicing', included: features?.billing },
    { text: `Max ${features?.max_bills_per_week === -1 ? 'Unlimited' : (features?.max_bills_per_week + ' Bills/Week')}`, included: features?.billing },
    { text: 'Sales Reports', included: features?.reports },
    { text: 'Excel Export', included: features?.export },
    { text: 'WhatsApp Reports', included: features?.whatsapp_reports },
  ];

  const handleAction = () => {
    if (plan_type === 'FREE') {
      onStartTrial();
    } else {
      onSubscribe(plan);
    }
  };

  const getButtonText = () => {
    if (isActive) return 'Current Plan';
    if (isProcessing) return 'Processing...';
    if (plan_type === 'FREE') {
      return trialUsed ? 'Trial Used' : 'Start 7-Day Trial';
    }
    // If it's the user's plan but it's expired, show "Renew"
    if (currentPlanType === plan_type && !isSubscribed) {
      return "Renew Plan";
    }
    return 'Upgrade Now';
  };

  return (
    <div
      className={`relative rounded-2xl shadow-lg border-2 hover:shadow-xl transition-all duration-300 p-6 ${color.border} ${color.bg} ${isActive ? 'ring-2 ring-green-500' : ''}`}
    >
      {plan_type === 'PRO' && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-purple-600 text-white px-4 py-1 text-xs font-semibold rounded-full shadow">
            Most Popular
          </span>
        </div>
      )}
      {isActive && (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 text-xs rounded-full flex items-center">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Active
        </div>
      )}

      <div className="flex items-center mb-4">
        <div className={`p-3 rounded-xl ${color.iconBg}`}>
          <Icon className={`w-7 h-7 ${color.text}`} />
        </div>
        <h3 className="ml-3 text-2xl font-bold text-gray-900">{name}</h3>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline">
          <span className="text-4xl font-extrabold text-gray-900">₹{Math.round(price)}</span>
          <span className="ml-2 text-gray-600 text-sm">
            / {duration === 'YEARLY' ? 'year' : 'month'}
          </span>
        </div>
        {plan_type === 'FREE' && <p className="text-gray-600 text-sm mt-1">{duration_days}-Day Free Trial</p>}
      </div>

      <ul className="space-y-3 mb-8">
        {featureList.map((f, i) => f.text && f.included !== undefined && <Feature key={i} text={f.text} included={f.included} />)}
      </ul>

      <button
        onClick={handleAction}
        disabled={isActive || isProcessing || (plan_type === 'FREE' && trialUsed)}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center ${
          isActive || (plan_type === 'FREE' && trialUsed)
            ? 'bg-gray-400 cursor-not-allowed'
            : isProcessing
            ? 'bg-gray-400 cursor-wait'
            : color.button
        }`}
      >
        {isProcessing ? <Loader2 className="animate-spin mr-2" /> : null}
        {getButtonText()}
      </button>
    </div>
  );
};

// --- Main Paywall Modal Component ---
const SubscriptionModal = () => {
  const { isModalOpen, closeModal, subscription, isSubscribed, refetchSubscription } = useSubscription();
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const isRazorpayLoaded = useRazorpay(); // Load the Razorpay script

  // Get current subscription details from context
  const currentPlanType = subscription?.plan_type || 'FREE';
  const isTrial = subscription?.is_trial;
  const daysRemaining = subscription?.days_remaining;
  const trialUsed = subscription?.trial_used || false;

  useEffect(() => {
    // Only fetch plans when the modal is opened
    if (isModalOpen) {
      setIsLoading(true);
      getSubscriptionPlans()
        .then(data => {
          // Sort plans: FREE, then BASIC, PRO, PREMIUM
          const planOrder = { 'FREE': 1, 'BASIC': 2, 'PRO': 3, 'PREMIUM': 4 };
          // Filter to only show MONTHLY plans + the FREE plan
          const monthlyPlans = data.filter(p => p.duration === 'MONTHLY' || p.plan_type === 'FREE');
          
          const sortedData = monthlyPlans.sort((a, b) => 
            (planOrder[a.plan_type] || 99) - (planOrder[b.plan_type] || 99)
          );
          setPlans(sortedData);
        })
        .catch(err => {
          console.error('Failed to load plans:', err);
          toast.error('Could not load subscription plans.');
        })
        .finally(() => setIsLoading(false));
    }
  }, [isModalOpen]); // Re-run only when modal is opened

  // --- Action Handlers ---

  const handleStartTrial = async () => {
    if (trialUsed) {
      toast.error("Trial has already been used.");
      return;
    }
    setIsProcessing(true);
    try {
      await startFreeTrial();
      toast.success("Free trial started!");
      await refetchSubscription(); // Refresh context
      closeModal(); // Close modal on success
    } catch (err) {
      console.error("Trial start failed:", err);
      toast.error(err.response?.data?.error || "Failed to start trial.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubscribe = async (plan) => {
    if (!isRazorpayLoaded) {
      toast.error("Payment gateway is still loading. Please wait a moment.");
      return;
    }
    
    setIsProcessing(true);
    let orderData;
    try {
      // 1. Create Order from our backend
      orderData = await createRazorpayOrder(plan.id);
      if (!orderData || !orderData.order_id) throw new Error("Failed to create order");

      // 2. Open Razorpay Checkout
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SmartBill Subscription",
        description: `Payment for ${plan.name}`,
        order_id: orderData.order_id,
        handler: async (response) => {
          // 3. Verify Payment with our backend
          try {
            await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            
            toast.success("Payment successful! Subscription activated.");
            await refetchSubscription(); // Refresh context
            closeModal(); // Close the modal
            
          } catch (verifyErr) {
            console.error("Verification failed:", verifyErr);
            toast.error("Payment verification failed. Please contact support.");
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: orderData.user_name || "Valued Customer",
          email: orderData.user_email || "",
        },
        theme: {
          color: "#4f46e5", // Indigo
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            if (!isModalOpen) return;
            toast.error("Payment was cancelled.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (orderErr) {
      console.error("Order creation failed:", orderErr);
      toast.error(orderErr.response?.data?.error || "Failed to create payment order.");
      setIsProcessing(false);
    }
  };

  // If the modal isn't open, render nothing
  if (!isModalOpen) {
    return null;
  }

  // --- Render the Modal ---
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-start p-4 pt-8 md:pt-20">
      <div className="bg-gradient-to-br from-gray-50 to-gray-200 p-6 md:p-8 rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto relative">
        
        {/* Close Button */}
        <button 
          onClick={closeModal} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Subscription Plans</h1>
          <p className="text-lg text-gray-600">Upgrade your experience and unlock advanced features</p>
          
          {subscription && (isTrial || trialUsed) && daysRemaining <= 0 && !isSubscribed && (
             <p className="text-lg text-red-600 font-semibold mt-2">
               Your trial has expired. Please upgrade to continue.
             </p>
          )}
          {subscription && isTrial && daysRemaining > 0 && (
             <p className="text-lg text-green-600 font-semibold mt-2">
               You are on a free trial. {daysRemaining} {daysRemaining > 1 ? 'days' : 'day'} remaining.
             </p>
          )}
        </div>

        {/* Plan Cards */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
            <p className="ml-4 text-gray-600">Loading plans...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentPlanType={currentPlanType}
                isSubscribed={isSubscribed} 
                onSubscribe={handleSubscribe}
                onStartTrial={handleStartTrial}
                isProcessing={isProcessing}
                trialUsed={trialUsed}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionModal;
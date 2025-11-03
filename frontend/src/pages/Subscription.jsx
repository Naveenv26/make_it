import React, { useEffect, useState } from 'react';
import { Check, X, Star, Zap, TrendingUp, Crown } from 'lucide-react';

const iconMap = {
  FREE: Star,
  BASIC: Zap,
  PRO: TrendingUp,
  PREMIUM: Crown,
};

const colorMap = {
  FREE: 'gray',
  BASIC: 'blue',
  PRO: 'purple',
  PREMIUM: 'amber',
};

const SubscriptionPlans = () => {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState('FREE');
  const [daysRemaining, setDaysRemaining] = useState(7);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch('/api/subscription/plans/');
        const data = await response.json();
        setPlans(data);
      } catch (error) {
        console.error('Failed to load plans:', error);
      }
    };
    fetchPlans();
  }, []);

  const handleSubscribe = async (planId) => {
    if (planId === currentPlan) return;

    try {
      const response = await fetch('/api/subscription/upgrade/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      if (response.ok) {
        setCurrentPlan(planId);
        alert('✅ Subscription upgraded successfully!');
      } else {
        alert('❌ Failed to upgrade. Please try again.');
      }
    } catch (error) {
      console.error(error);
      alert('Something went wrong. Try again later.');
    }
  };

  const colorClasses = {
    gray: 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100',
    blue: 'border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100',
    purple: 'border-purple-400 bg-gradient-to-br from-purple-50 to-purple-100',
    amber: 'border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100',
  };

  const buttonColors = {
    gray: 'bg-gray-500 hover:bg-gray-600',
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    amber: 'bg-amber-600 hover:bg-amber-700',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Subscription Plans</h1>
        <p className="text-lg text-gray-600">Upgrade your experience and unlock advanced features</p>
      </div>

      {/* Plan Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const Icon = iconMap[plan.plan_type] || Star;
          const color = colorMap[plan.plan_type];
          const isActive = currentPlan === plan.plan_type;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl shadow-lg border-2 hover:shadow-2xl transition-all duration-300 p-6 ${
                colorClasses[color]
              } ${isActive ? 'ring-2 ring-green-500' : ''}`}
            >
              {/* Popular Tag */}
              {plan.plan_type === 'PRO' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-purple-600 text-white px-4 py-1 text-xs font-semibold rounded-full shadow">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Active Badge */}
              {isActive && (
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 text-xs rounded-full">
                  Active
                </div>
              )}

              {/* Plan Header */}
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-xl bg-${color}-100`}>
                  <Icon className={`w-7 h-7 text-${color}-600`} />
                </div>
                <h3 className="ml-3 text-2xl font-bold text-gray-900">{plan.name}</h3>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold text-gray-900">₹{plan.price}</span>
                  <span className="ml-2 text-gray-600 text-sm">
                    / {plan.duration === 'YEARLY' ? 'year' : 'month'}
                  </span>
                </div>
                {plan.plan_type === 'FREE' && (
                  <p className="text-red-600 text-sm mt-1">
                    Trial expires in {daysRemaining} days
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {Object.entries(plan.features).map(([key, value], idx) => {
                  const featureLabel =
                    key === 'dashboard'
                      ? 'Dashboard Access'
                      : key === 'stock'
                      ? 'Stock Maintenance'
                      : key === 'billing'
                      ? 'Billing'
                      : key === 'reports'
                      ? 'Reports'
                      : key === 'export'
                      ? 'Excel Export'
                      : key === 'whatsapp_reports'
                      ? 'WhatsApp Reports'
                      : key === 'max_bills_per_week'
                      ? (value === -1 ? 'Unlimited Bills' : `${value} Bills/Week`)
                      : key;
                  return (
                    <li key={idx} className="flex items-start">
                      {value ? (
                        <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 mr-2 flex-shrink-0 mt-0.5" />
                      )}
                      <span
                        className={`text-sm ${
                          value ? 'text-gray-800' : 'text-gray-400'
                        }`}
                      >
                        {featureLabel}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* Subscribe Button */}
              <button
                onClick={() => handleSubscribe(plan.plan_type)}
                disabled={isActive}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
                  isActive
                    ? 'bg-gray-400 cursor-not-allowed'
                    : buttonColors[color]
                }`}
              >
                {isActive ? 'Current Plan' : 'Upgrade Now'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionPlans;

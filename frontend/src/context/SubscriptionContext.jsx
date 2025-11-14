// frontend/src/context/SubscriptionContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from "../api/axios"; // Use the intercepting client from api/axios.js
import { toast } from 'react-hot-toast';

// 1. Create the context (NOT exported)
const SubscriptionContext = createContext();

// 2. Create a custom hook to use the context (Exported)
export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// 3. Create the provider component (Exported)
export const SubscriptionProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false); // Assume false until proven otherwise
  const [loading, setLoading] = useState(true);

  const openModal = () => setIsModalOpen(true);
  
  const closeModal = () => {
    // Only allow closing if they are subscribed or in trial
    if (isSubscribed || (subscription?.is_trial && subscription?.days_remaining > 0)) {
      setIsModalOpen(false);
    } else {
      toast.error("You must subscribe or start a trial to continue.");
    }
  };

  const fetchSubscription = useCallback(async () => {
    // If there's no token, we're not logged in. Don't try to fetch.
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      setIsSubscribed(false); // Ensure we are marked as not subscribed
      setSubscription(null);
      return; // Stop execution
    }

    setLoading(true);
    try {
      // This endpoint is defined in api/payment_views.py
      const { data } = await client.get("/payments/subscription-status/");
      
      setSubscription(data.subscription);
      setIsSubscribed(data.is_valid);
      
      // This is the paywall: if not valid, open the modal.
      if (!data.is_valid) {
        setIsModalOpen(true);
      }

    } catch (err) {
      console.error("Subscription check failed:", err);
      
      // Check for 403 (Subscription Expired) from our middleware
      if (err.response && err.response.status === 403) {
        toast.error(err.response.data.detail || "Subscription expired. Please pay.");
        setIsSubscribed(false);
        setSubscription(null);
        setIsModalOpen(true); // Force open paywall
      } 
      // 401 (Unauthorized) is handled by the axios interceptor
      
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch status on initial load
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);
  
  // This effect will re-run fetchSubscription when the user logs in
  useEffect(() => {
    const handleLogin = () => {
      // Small delay to ensure token is set
      setTimeout(() => {
        const token = localStorage.getItem("access_token");
        // Refetch if token exists AND (we have no subscription data OR the subscription is invalid)
        if (token && (!subscription || !isSubscribed)) {
          fetchSubscription();
        }
      }, 100);
    };

    // We create a custom event to be fired on successful login
    window.addEventListener('login-success', handleLogin);
    
    const handleLogout = () => {
      if (!localStorage.getItem("access_token")) {
        setSubscription(null);
        setIsSubscribed(false);
        setIsModalOpen(false);
      }
    };
    // Listen for storage changes (e.g., logout clears token)
    window.addEventListener('storage', handleLogout);

    return () => {
      window.removeEventListener('login-success', handleLogin);
      window.removeEventListener('storage', handleLogout);
    };
  }, [fetchSubscription, subscription, isSubscribed]);


  const value = {
    isModalOpen,
    openModal,
    closeModal,
    subscription,
    isSubscribed,
    loading,
    refetchSubscription: fetchSubscription, // Expose the refetch function
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
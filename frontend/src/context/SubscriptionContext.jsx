import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from "../api/axios"; // Use the intercepting client from api/axios.js
import { toast } from 'react-hot-toast';

// Create the context
const SubscriptionContext = createContext();

// Create a custom hook to use the context
export const useSubscription = () => useContext(SubscriptionContext);

// Create the provider component
export const SubscriptionProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false); // Assume false until proven otherwise
  const [loading, setLoading] = useState(true);

  const openModal = () => setIsModalOpen(true);
  
  const closeModal = () => {
    // Only allow closing if they are subscribed or in trial
    if (isSubscribed || subscription?.trial_used) {
      setIsModalOpen(false);
    } else {
      toast.error("You must subscribe to continue.");
    }
  };

  const fetchSubscription = useCallback(async () => {
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
      // 401 (Unauthorized) is handled by the axios interceptor in api/axios.js
      
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch status on initial load
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

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
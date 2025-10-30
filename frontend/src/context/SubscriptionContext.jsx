import React, { createContext, useContext, useState } from 'react';

// Create the context
const SubscriptionContext = createContext();

// Create a custom hook to use the context
export const useSubscription = () => useContext(SubscriptionContext);

// Create the provider component
export const SubscriptionProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const value = {
    isModalOpen,
    openModal,
    closeModal,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

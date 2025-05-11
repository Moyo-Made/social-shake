"use client"

import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useConversations } from '@/hooks/useMessaging';
import { MessagingContextType } from '@/types/messaging';

// Create context with default values
const MessagingContext = createContext<MessagingContextType>({
  conversations: [],
  unreadCount: 0,
  loading: false,
  error: null,
  startConversation: async () => null,
  getConversation: async () => null
});

export const MessagingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  
  const {
    conversations,
    unreadCount,
    loading,
    error,
    startConversation,
    getConversation
  } = useConversations(userId);

  // Value to be provided to consumers
  const value = {
    conversations,
    unreadCount,
    loading,
    error,
    startConversation,
    getConversation
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
};

// Hook for using the messaging context
export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';

interface VerificationStatus {
  status: 'pending' | 'approved' | 'rejected' | 'info_requested' | 'suspended';
  rejectionReason?: string | null;
  infoRequest?: string | null;
  suspensionReason?: string | null;
  updatedAt: string;
}

interface UnreadCounts {
  totalUnread: number;
  conversationCounts: Record<string, number>;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  verificationStatus: VerificationStatus | null;
  unreadCounts: UnreadCounts | null;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  markAsRead: (conversationId: string, userId: string) => void;
  subscribeToVerification: (userId: string) => void;
  // Event listeners for components
  onVerificationUpdate: (callback: (status: VerificationStatus) => void) => () => void;
  onUnreadCountsUpdate: (callback: (counts: UnreadCounts) => void) => () => void;
  refreshVerificationStatus: (userId: string) => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts | null>(null);
  const { currentUser } = useAuth();

  // Use refs to avoid stale closures
  const verificationCallbacksRef = useRef<Set<(status: VerificationStatus) => void>>(new Set());
  const unreadListenersRef = useRef<Set<(counts: UnreadCounts) => void>>(new Set());

  useEffect(() => {
    // Only initialize socket if user is logged in
    if (!currentUser) {
      // Clear states when user logs out
      setVerificationStatus(null);
      setUnreadCounts(null);
      return;
    }

    // Get the socket server URL from environment variables
    const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || '';
    
    if (!socketServerUrl) {
      console.error('Socket server URL is not defined in environment variables');
      return;
    }


    // Connect to WebSocket server with additional options for reliability
    const socketInstance = io(socketServerUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      forceNew: true, // Force new connection
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      
      // Subscribe to user-specific updates
      socketInstance.emit('subscribe-user', currentUser.uid);
      // Also subscribe to verification updates
      socketInstance.emit('subscribe-verification', currentUser.uid);
      // Subscribe to notifications
      socketInstance.emit('subscribe-notifications', currentUser.uid);
    
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Listen for unread counts updates
    socketInstance.on('unread-counts-update', (data: UnreadCounts) => {
      setUnreadCounts(data);
      
      // Notify all listeners using ref
      unreadListenersRef.current.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in unread callback:', error);
        }
      });
    });

    // Listen for verification status updates
    socketInstance.on('verification-status-update', (data: VerificationStatus) => {
      setVerificationStatus(data);
      
      // Notify all listeners using ref to avoid stale closures
      verificationCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in verification callback:', error);
        }
      });
    });

    // Listen for new messages
    socketInstance.on('new-message', () => {
      // You can handle new messages here if needed
    });

    // Listen for conversation updates
    socketInstance.on('conversation-updated', () => {
      // You can handle conversation updates here if needed
    });

    // Notification-related socket listeners are now handled in useNotifications hook
    // This keeps the context focused and prevents duplicate listeners

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
      setVerificationStatus(null);
      setUnreadCounts(null);
    };
  }, [currentUser]);

  // Internal refresh function that doesn't depend on callbacks
  const refreshVerificationStatusInternal = useCallback(async (userId: string) => {
    try {

      const response = await fetch(`/api/verification?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(data);
        
        // Notify all subscribers using ref to avoid stale closures
        verificationCallbacksRef.current.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error('Error in verification callback:', error);
          }
        });
      } else {
        console.error('Failed to fetch verification status:', response.status);
      }
    } catch (error) {
      console.error('Error refreshing verification status:', error);
    }
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    if (socket && conversationId) {
      socket.emit('join-conversation', conversationId);
    }
  }, [socket]);

  const leaveConversation = useCallback((conversationId: string) => {
    if (socket && conversationId) {
      socket.emit('leave-conversation', conversationId);
    }
  }, [socket]);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    if (socket && currentUser && conversationId && content.trim()) {
      socket.emit('send-message', {
        conversationId,
        senderId: currentUser.uid,
        content: content.trim(),
      });
    }
  }, [socket, currentUser]);
  
  const markAsRead = useCallback((conversationId: string, userId: string) => {
    if (socket && conversationId && userId) {
      socket.emit('mark-read', {
        conversationId,
        userId,
      });
    }
  }, [socket]);

  const subscribeToVerification = useCallback((userId: string) => {
    if (socket && userId) {
      socket.emit('subscribe-verification', userId);
      // Also refresh the current status
      refreshVerificationStatusInternal(userId);
    }
  }, [socket, refreshVerificationStatusInternal]);

  // Event listener management using refs
  const onVerificationUpdate = useCallback((callback: (data: VerificationStatus) => void) => {
    
    verificationCallbacksRef.current.add(callback);

    // Return unsubscribe function
    return () => {

      verificationCallbacksRef.current.delete(callback);
    };
  }, []);

  // Public refresh function that components can call
  const refreshVerificationStatus = useCallback(async (userId: string) => {
    await refreshVerificationStatusInternal(userId);
  }, [refreshVerificationStatusInternal]);

  const onUnreadCountsUpdate = useCallback((callback: (counts: UnreadCounts) => void) => {
    unreadListenersRef.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      unreadListenersRef.current.delete(callback);
    };
  }, []);

  const value: SocketContextType = {
    socket,
    isConnected,
    verificationStatus,
    unreadCounts,
    joinConversation,
    leaveConversation,
    sendMessage,
    markAsRead,
    subscribeToVerification,
    onVerificationUpdate,
    onUnreadCountsUpdate,
    refreshVerificationStatus
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  markAsRead: (conversationId: string, userId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinConversation: () => {},
  leaveConversation: () => {},
  sendMessage: () => {},
  markAsRead: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    // Only initialize socket if user is logged in
    if (!currentUser) return;

    // Get the socket server URL from environment variables
    const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || '';
    
    if (!socketServerUrl) {
      console.error('Socket server URL is not defined in environment variables');
      return;
    }

    console.log('Connecting to socket server:', socketServerUrl);

    // Connect to WebSocket server with additional options for reliability
    const socketInstance = io(socketServerUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
      
      // Subscribe to user-specific updates
      socketInstance.emit('subscribe-user', currentUser.uid);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Listen for unread counts updates
    socketInstance.on('unread-counts-update', (data) => {
      console.log('Received unread counts update:', data);
      // You can dispatch this to your state management if needed
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket connection');
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [currentUser]);

  const joinConversation = (conversationId: string) => {
    if (socket && conversationId) {
      console.log(`Joining conversation: ${conversationId}`);
      socket.emit('join-conversation', conversationId);
    }
  };

  const leaveConversation = (conversationId: string) => {
    if (socket && conversationId) {
      console.log(`Leaving conversation: ${conversationId}`);
      socket.emit('leave-conversation', conversationId);
    }
  };

  const sendMessage = (conversationId: string, content: string) => {
    if (socket && currentUser && conversationId && content.trim()) {
      console.log(`Sending message to conversation: ${conversationId}`);
      socket.emit('send-message', {
        conversationId,
        senderId: currentUser.uid,
        content: content.trim(),
      });
    }
  };
  
  const markAsRead = (conversationId: string, userId: string) => {
    if (socket && conversationId && userId) {
      console.log(`Marking conversation as read: ${conversationId} for user: ${userId}`);
      socket.emit('mark-read', {
        conversationId,
        userId,
      });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinConversation,
        leaveConversation,
        sendMessage,
        markAsRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
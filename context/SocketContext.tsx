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

    // Connect to WebSocket server
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      
      // Subscribe to user-specific updates
      socketInstance.emit('subscribe-user', currentUser.uid);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [currentUser]);

  const joinConversation = (conversationId: string) => {
    if (socket && conversationId) {
      socket.emit('join-conversation', conversationId);
    }
  };

  const leaveConversation = (conversationId: string) => {
    if (socket && conversationId) {
      socket.emit('leave-conversation', conversationId);
    }
  };

  const sendMessage = (conversationId: string, content: string) => {
    if (socket && currentUser && conversationId && content.trim()) {
      socket.emit('send-message', {
        conversationId,
        senderId: currentUser.uid,
        content: content.trim(),
      });
    }
  };
  
  const markAsRead = (conversationId: string, userId: string) => {
    if (socket && conversationId && userId) {
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
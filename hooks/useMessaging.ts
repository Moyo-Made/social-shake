/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import {
  getOrCreateConversation,
  getConversation as fetchConversation,
  sendMessage,
  getMessages,
  subscribeToMessages,
  markMessagesAsRead,
  getUserConversations,
  subscribeToUserConversations,
  getUnreadMessageCount,
  getConversationUsers
} from '../lib/firebase/messaging';
import { Message, Conversation, ConversationHookReturn, User } from '@/types/messaging';

/**
 * Hook for managing a specific conversation between two users
 */
export const useConversation = (
  currentUserId: string | null | undefined,
  otherUserId: string | null | undefined,
  conversationId?: string
): ConversationHookReturn => {
  const [convId, setConvId] = useState<string | null>(conversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize or fetch conversation
  useEffect(() => {
    const initConversation = async () => {
      if (!currentUserId) return;
      
      try {
        setLoading(true);
        
        // If we're using a direct conversation ID
        if (conversationId) {
          setConvId(conversationId);
        } 
        // Otherwise create/get conversation between users
        else if (otherUserId) {
          const id = await getOrCreateConversation(currentUserId, otherUserId);
          setConvId(id);
        } else {
          throw new Error("Missing conversation ID or other user ID");
        }
      } catch (err: any) {
        console.error('Error initializing conversation:', err);
        setError(err.message || 'Failed to initialize conversation');
      } finally {
        setLoading(false);
      }
    };

    initConversation();
  }, [currentUserId, otherUserId, conversationId]);

  // Fetch initial messages when conversation ID is available
  useEffect(() => {
    const fetchInitialMessages = async () => {
      if (!convId) return;
      
      try {
        setLoading(true);
        const initialMessages = await getMessages(convId);
        setMessages(initialMessages);
        
        // Mark messages as read if current user is available
        if (currentUserId) {
          await markMessagesAsRead(convId, currentUserId);
        }
      } catch (err: any) {
        console.error("Error fetching messages:", err);
        setError(err.message || "Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialMessages();
  }, [convId, currentUserId]);

  // Subscribe to new messages
  useEffect(() => {
    if (!convId || !currentUserId) return () => {};
    
    const unsubscribe = subscribeToMessages(convId, (newMessage) => {
      setMessages(prevMessages => {
        // Check if message already exists to prevent duplicates
        if (prevMessages.some(msg => msg.id === newMessage.id)) {
          return prevMessages;
        }
        return [...prevMessages, newMessage];
      });
      
      // Mark message as read if receiver is current user
      if (newMessage.receiverId === currentUserId) {
        markMessagesAsRead(convId, currentUserId);
      }
    });
    
    return () => unsubscribe();
  }, [convId, currentUserId]);

  // Send message function
  const sendMessageToUser = useCallback(async (
    text: string, 
    attachmentUrl: string | null = null
  ): Promise<boolean> => {
    if (!convId || !currentUserId || !otherUserId || !text.trim()) {
      return false;
    }
    
    try {
      await sendMessage(convId, currentUserId, otherUserId, text, attachmentUrl);
      return true;
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
      return false;
    }
  }, [convId, currentUserId, otherUserId]);

  // Mark messages as read
  const markAsRead = useCallback(async (): Promise<void> => {
    if (!convId || !currentUserId) return;
    
    try {
      await markMessagesAsRead(convId, currentUserId);
    } catch (err: any) {
      console.error('Error marking messages as read:', err);
      setError(err.message || 'Failed to mark messages as read');
    }
  }, [convId, currentUserId]);

  return {
    messages,
    loading,
    error,
    sendMessage: sendMessageToUser,
    markAsRead
  };
};

/**
 * Hook for managing all conversations for a user
 */
export const useConversations = (userId: string | null | undefined) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userDetails, setUserDetails] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch all conversations for the user
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return () => {};
    }
    
    setLoading(true);
    
    // Initial fetch of conversations
    const fetchConversations = async () => {
      try {
        const userConversations = await getUserConversations(userId);
        setConversations(userConversations);
        
        // Extract all unique user IDs
        const userIds = new Set<string>();
        userConversations.forEach(conv => {
          conv.participants.forEach(participantId => {
            if (participantId !== userId) {
              userIds.add(participantId);
            }
          });
        });
        
        // Fetch user details for all participants
        if (userIds.size > 0) {
          const userRecord: Record<string, boolean> = Array.from(userIds).reduce((acc, userId) => {
            acc[userId] = true;
            return acc;
          }, {} as Record<string, boolean>);
          const users = await getConversationUsers(userRecord);
          setUserDetails(users);
        }
        
        // Get unread count
        const count = await getUnreadMessageCount(userId);
        setUnreadCount(count);
      } catch (err: any) {
        console.error('Error fetching conversations:', err);
        setError(err.message || 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
    
    // Subscribe to conversation updates
    const unsubscribe = subscribeToUserConversations(userId, async (updatedConversations) => {
      setConversations(updatedConversations);
      
      // Update unread count when conversations change
      try {
        const count = await getUnreadMessageCount(userId);
        setUnreadCount(count);
      } catch (err) {
        console.error('Error getting unread count:', err);
      }
    });
    
    return () => unsubscribe();
  }, [userId]);

  // Process conversations to include other user info
  const processedConversations = conversations.map(conv => {
    const otherUserId = conv.participants?.find(id => id !== userId) || '';
    const otherUser = userDetails[otherUserId];
    
    return {
      ...conv,
      otherUser
    };
  });

  // Start a new conversation or get existing one
  const startConversation = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!userId || !otherUserId) return null;
    
    try {
      return await getOrCreateConversation(userId, otherUserId);
    } catch (err: any) {
      console.error('Error starting conversation:', err);
      setError(err.message || 'Failed to start conversation');
      return null;
    }
  }, [userId]);

  // Get a specific conversation
  const getConversation = useCallback(async (conversationId: string): Promise<Conversation | null> => {
    try {
      return await fetchConversation(conversationId);
    } catch (err: any) {
      console.error('Error fetching conversation:', err);
      setError(err.message || 'Failed to fetch conversation');
      return null;
    }
  }, []);

  return {
    conversations: processedConversations,
    unreadCount,
    loading,
    error,
    startConversation,
    getConversation
  };
};
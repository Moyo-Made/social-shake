import { Timestamp } from "firebase/firestore";

export interface User {
  id: string;
  displayName?: string;
  photoURL?: string;
  isActive?: boolean;
  isOnline?: boolean;
}

export interface Message {
  content:  string;
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: Timestamp;
  isRead: boolean;
  attachmentUrl?: string | null;
}

export interface Conversation {
  contestId: string | number;
  id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    timestamp: Timestamp | Date;
  };
  lastMessageTimestamp?: Timestamp | null;
  lastMessageSenderId?: string;
  createdAt?: Timestamp | null;
  
  // UI-specific fields (populated client-side)
  otherUser?: User;
  unreadCount?: number;
}

export interface MessagingContextType {
  conversations: Conversation[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  startConversation: (otherUserId: string) => Promise<string | null>;
  getConversation: (conversationId: string) => Promise<Conversation | null>;
}

export interface ConversationHookReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  sendMessage: (text: string, attachmentUrl?: string | null) => Promise<boolean>;
  markAsRead: () => Promise<void>;
}
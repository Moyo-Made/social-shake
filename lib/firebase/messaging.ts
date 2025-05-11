import { db } from "@/config/firebase";
import {
  collection,
  addDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  onSnapshot,
  limit,
  Timestamp,

} from "firebase/firestore";
import { Message, Conversation, User } from "@/types/messaging";

/**
 * Create a new conversation or get existing one between two users
 */
export const getOrCreateConversation = async (
  userId1: string,
  userId2: string
): Promise<string> => {
  // Sort IDs to ensure consistency when querying
  const participants = [userId1, userId2].sort();

  // Check if conversation already exists
  const conversationsRef = collection(db, "conversations");
  const q = query(conversationsRef, where("participants", "==", participants));

  const querySnapshot = await getDocs(q);

  // Return existing conversation if found
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].id;
  }

  // Create new conversation if not found
  const newConversationRef = await addDoc(conversationsRef, {
    participants,
    createdAt: serverTimestamp(),
    lastMessage: "",
    lastMessageTimestamp: serverTimestamp(),
    lastMessageSenderId: "",
  });

  return newConversationRef.id;
};

/**
 * Get a specific conversation by ID
 */
export const getConversation = async (conversationId: string): Promise<Conversation | null> => {
  try {
    const conversationRef = doc(db, "conversations", conversationId);
    const conversationSnapshot = await getDoc(conversationRef);
    
    if (!conversationSnapshot.exists()) {
      return null;
    }
    
    return {
      id: conversationSnapshot.id,
      ...conversationSnapshot.data() as Omit<Conversation, 'id'>
    };
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return null;
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  receiverId: string,
  text: string,
  attachmentUrl: string | null = null
): Promise<string> => {
  try {
    // Add message to the messages subcollection
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const messageData: Omit<Message, "id"> = {
		text,
		senderId,
		receiverId,
		timestamp: serverTimestamp() as Timestamp,
		isRead: false,
		...(attachmentUrl && { attachmentUrl }),
		content: ""
	};

    const newMessageRef = await addDoc(messagesRef, messageData);

    // Update conversation with last message info
    const conversationRef = doc(db, "conversations", conversationId);
    await updateDoc(conversationRef, {
      lastMessage: text,
      lastMessageTimestamp: serverTimestamp(),
      lastMessageSenderId: senderId,
    });

    return newMessageRef.id;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

/**
 * Get messages for a conversation
 */
export const getMessages = async (
  conversationId: string,
  messageLimit = 50
): Promise<Message[]> => {
  try {
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const q = query(
      messagesRef,
      orderBy("timestamp", "desc"),
      limit(messageLimit)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Message))
      .reverse(); // Reverse to get chronological order
  } catch (error) {
    console.error("Error getting messages:", error);
    return [];
  }
};

/**
 * Listen to new messages in a conversation
 */
export const subscribeToMessages = (
  conversationId: string,
  callback: (message: Message) => void
): (() => void) => {
  const messagesRef = collection(db, "conversations", conversationId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "desc"), limit(1));

  return onSnapshot(q, (snapshot) => {
    const changes = snapshot.docChanges();
    changes.forEach((change) => {
      if (change.type === "added") {
        const message = {
          id: change.doc.id,
          ...change.doc.data(),
        } as Message;
        callback(message);
      }
    });
  }, error => {
    console.error("Error subscribing to messages:", error);
  });
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  try {
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const q = query(
      messagesRef,
      where("receiverId", "==", userId),
      where("isRead", "==", false)
    );

    const querySnapshot = await getDocs(q);

    const updatePromises: Promise<void>[] = [];
    querySnapshot.forEach((document) => {
      const messageRef = doc(
        db,
        "conversations",
        conversationId,
        "messages",
        document.id
      );
      updatePromises.push(updateDoc(messageRef, { isRead: true }));
    });

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
  } catch (error) {
    console.error("Error marking messages as read:", error);
  }
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    const conversationsRef = collection(db, "conversations");
    const q = query(
      conversationsRef,
      where("participants", "array-contains", userId),
      orderBy("lastMessageTimestamp", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Conversation));
  } catch (error) {
    console.error("Error getting user conversations:", error);
    return [];
  }
};

/**
 * Subscribe to user conversations to get real-time updates
 */
export const subscribeToUserConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void
): (() => void) => {
  if (!userId) {
    console.error("Cannot subscribe to conversations without a user ID");
    return () => {};
  }

  const conversationsRef = collection(db, "conversations");
  const q = query(
    conversationsRef,
    where("participants", "array-contains", userId),
    orderBy("lastMessageTimestamp", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Conversation));
    callback(conversations);
  }, error => {
    console.error("Error subscribing to conversations:", error);
  });
};

/**
 * Get user details for conversations
 */
export const getConversationUsers = async (
  userIds: string[]
): Promise<Record<string, User>> => {
  try {
    const users: Record<string, User> = {};
    
    for (const userId of userIds) {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        users[userId] = {
          id: userId,
          displayName: userData.displayName || "User",
          photoURL: userData.photoURL || "/default-avatar.png",
          isActive: userData.isActive || false,
        };
      } else {
        // Add default user if not found
        users[userId] = {
          id: userId,
          displayName: "Unknown User",
          photoURL: "/default-avatar.png",
          isActive: false,
        };
      }
    }
    
    return users;
  } catch (error) {
    console.error("Error fetching user details:", error);
    return {};
  }
};

/**
 * Get unread message count for a user
 */
export const getUnreadMessageCount = async (userId: string): Promise<number> => {
  try {
    const conversations = await getUserConversations(userId);
    let totalUnread = 0;

    for (const conversation of conversations) {
      const messagesRef = collection(db, "conversations", conversation.id, "messages");
      const q = query(
        messagesRef,
        where("receiverId", "==", userId),
        where("isRead", "==", false)
      );

      const querySnapshot = await getDocs(q);
      totalUnread += querySnapshot.size;
    }

    return totalUnread;
  } catch (error) {
    console.error("Error getting unread message count:", error);
    return 0;
  }
};
// import { useState, useEffect } from 'react';
// import { 
//   getUserConversations, 
//   subscribeToUserConversations, 
//   getOrCreateConversation, 
//   getUnreadMessageCount, 
// } from '@/hooks/useMessaging';

// export const useConversations = (userId: string | null) => {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   const [conversations, setConversations] = useState<any[]>([]);
//   const [unreadCount, setUnreadCount] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<Error | null>(null);

//   useEffect(() => {
//     let unsubscribe: (() => void) | null = null;

//     const loadConversations = async () => {
//       if (!userId) {
//         setConversations([]);
//         setUnreadCount(0);
//         setLoading(false);
//         return;
//       }

//       try {
//         setLoading(true);
        
//         // Get initial conversations
//         const initialConversations = await getUserConversations(userId);
//         setConversations(initialConversations);
        
//         // Get initial unread count
//         const initialUnreadCount = await getUnreadMessageCount(userId);
//         setUnreadCount(initialUnreadCount);
        
//         // Subscribe to conversation updates
// 		unsubscribe = subscribeToUserConversations(
// 		  userId, 
// 		  // eslint-disable-next-line @typescript-eslint/no-explicit-any
// 		  (updatedConversations: any) => {
// 			setConversations(updatedConversations);
			
// 			// Update unread count when conversations change
// 			getUnreadMessageCount(userId).then((count: number) => {
// 			  setUnreadCount(count);
// 			});
// 		  }
// 		);
        
//         setLoading(false);
//       } catch (err) {
//         console.error("Error in useConversations hook:", err);
//         setError(err instanceof Error ? err : new Error(String(err)));
//         setLoading(false);
//       }
//     };

//     loadConversations();

//     return () => {
//       // Clean up subscription
//       if (unsubscribe) {
//         unsubscribe();
//       }
//     };
//   }, [userId]);

//   const startConversation = async (otherUserId: string): Promise<string | null> => {
//     if (!userId) return null;
    
//     try {
//       return await getOrCreateConversation(userId, otherUserId);
//     } catch (err) {
//       console.error("Error starting conversation:", err);
//       setError(err instanceof Error ? err : new Error(String(err)));
//       return null;
//     }
//   };

//   return {
//     conversations,
//     unreadCount,
//     loading,
//     error,
//     startConversation
//   };
// };
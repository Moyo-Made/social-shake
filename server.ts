import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import "@/config/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

const db = getFirestore();
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;

interface ChatMessage {
	conversationId: string;
	senderId: string;
	content: string;
}

app.prepare().then(() => {
	const server = createServer((req, res) => {
		const parsedUrl = parse(req.url || "", true);
		handle(req, res, parsedUrl);
	});

	// Initialize Socket.io
	const io = new SocketIOServer(server, {
		cors: {
			origin: dev ? "*" : process.env.NEXT_PUBLIC_SITE_URL,
			methods: ["GET", "POST"],
		},
	});

	io.on("connection", (socket) => {
		console.log("A client connected:", socket.id);

		// Join conversation rooms
		socket.on("join-conversation", (conversationId) => {
			console.log(`User ${socket.id} joined conversation ${conversationId}`);
			socket.join(conversationId);
		});

		// Leave conversation room
		socket.on("leave-conversation", (conversationId) => {
			console.log(`User ${socket.id} left conversation ${conversationId}`);
			socket.leave(conversationId);
		});

		// Handle new message
		socket.on("send-message", async (message: ChatMessage) => {
			try {
				const { conversationId, senderId, content } = message;

				if (!conversationId || !senderId || !content.trim()) {
					socket.emit("error", "Missing required fields");
					return;
				}

				// Check if conversation exists
				const conversationRef = db
					.collection("conversations")
					.doc(conversationId);
				const conversationDoc = await conversationRef.get();

				if (!conversationDoc.exists) {
					socket.emit("error", "Conversation not found");
					return;
				}

				// Get conversation data and participants
				const conversationData = conversationDoc.data();
				const participants = conversationData?.participants || [];

				// Get other participants to mark message as unread for them
				const otherParticipants = participants.filter(
					(id: string) => id !== senderId
				);

				// Create readStatus object with all recipients marked as unread
				const readStatus: Record<string, boolean> = {};
				otherParticipants.forEach((participantId: string) => {
					readStatus[participantId] = false;
				});
				// The sender has read their own message
				readStatus[senderId] = true;

				// Get current timestamp for emitting to clients
				const clientTimestamp = new Date().toISOString();

				// Add message to the conversation's messages subcollection
				const messageRef = await conversationRef.collection("messages").add({
					sender: senderId,
					content: content,
					timestamp: FieldValue.serverTimestamp(), // Use server timestamp for storage
					readStatus: readStatus, // Add read status for each recipient
				});

				// Get the message data to emit to clients
				const messageData = {
					id: messageRef.id,
					sender: senderId,
					content: content,
					timestamp: clientTimestamp,
					conversationId: conversationId, // Include conversationId in the message
				};

				// Update conversation with last message, timestamp, and unread counts
				const updateData: Record<
					string,
					string | number | FirebaseFirestore.FieldValue
				> = {
					lastMessage: content,
					updatedAt: FieldValue.serverTimestamp(),
				};

				// Increment unread count for all other participants
				for (const participantId of otherParticipants) {
					updateData[`unreadCounts.${participantId}`] = FieldValue.increment(1);
				}

				await conversationRef.update(updateData);

				// Emit the new message to all users in the conversation
				io.to(conversationId).emit("new-message", messageData);

				// For each participant, emit updated unread counts
				if (conversationData && conversationData.participants) {
					for (const participantId of conversationData.participants) {
						// Don't emit to the sender since they don't have unread messages
						if (participantId !== senderId) {
							await emitUnreadCounts(participantId);
						}
					}
				}

				// Also emit a conversation update to all relevant users
				if (conversationData && conversationData.participants) {
					// Broadcast to all participants that the conversation was updated
					conversationData.participants.forEach((participantId: string) => {
						io.to(`user-${participantId}`).emit("conversation-updated", {
							conversationId,
							lastMessage: content,
							updatedAt: clientTimestamp,
							unreadCounts: conversationData.unreadCounts || {}, // Include unread counts in update
						});
					});
				}
			} catch (error) {
				console.error("Error handling message:", error);
				socket.emit("error", "Failed to send message");
			}
		});

    socket.on('mark-read', async (data: { conversationId: string, userId: string }) => {
      try {
        const { conversationId, userId } = data;
        
        // Update the conversation document to reset unread count
        const conversationRef = db.collection('conversations').doc(conversationId);
        await conversationRef.update({
          [`unreadCounts.${userId}`]: 0
        });
        
        // Mark all messages as read in the database
        const messagesRef = conversationRef.collection('messages');
        const unreadMessages = await messagesRef.where(`readStatus.${userId}`, '==', false).get();
        
        const batch = db.batch();
        unreadMessages.docs.forEach(doc => {
          batch.update(doc.ref, {
            [`readStatus.${userId}`]: true
          });
        });
        
        if (unreadMessages.size > 0) {
          await batch.commit();
        }
        
        // Emit updated unread counts to this user
        await emitUnreadCounts(userId);
        
      } catch (error) {
        console.error('Error marking as read:', error);
        socket.emit('error', 'Failed to mark messages as read');
      }
    });

		// Subscribe to user-specific updates
		socket.on("subscribe-user", (userId) => {
			if (userId) {
				console.log(`User ${socket.id} subscribed as ${userId}`);
				socket.join(`user-${userId}`);
			}
		});

		socket.on("disconnect", () => {
			console.log("Client disconnected:", socket.id);
		});
	});

	// Helper function to emit unread counts to a specific user
	async function emitUnreadCounts(userId: string) {
		try {
			// Query conversations where the user is a participant
			const conversationsRef = db.collection("conversations");
			const snapshot = await conversationsRef
				.where("participants", "array-contains", userId)
				.get();

			let totalUnread = 0;
			const conversationCounts: Record<string, number> = {};

			// Sum up all unread counts across all conversations
			snapshot.docs.forEach((doc) => {
				const data = doc.data();
				const unreadCount = data.unreadCounts?.[userId] || 0;
				totalUnread += unreadCount;
				conversationCounts[doc.id] = unreadCount;
			});

			// Emit to this specific user's room
			io.to(`user-${userId}`).emit("unread-counts-update", {
				totalUnread,
				conversationCounts,
			});
		} catch (error) {
			console.error("Error emitting unread counts:", error);
		}
	}

	server.listen(port, () => {
		console.log(`> Ready on http://localhost:${port}`);
	});
});

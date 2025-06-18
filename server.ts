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

interface VerificationUpdate {
	userId: string;
	status: "pending" | "approved" | "rejected" | "info_requested" | "suspended";
	rejectionReason?: string;
	infoRequest?: string;
	suspensionReason?: string;
	updatedAt?: string;
}

// Global IO instance for external access
let globalIO: SocketIOServer;

app.prepare().then(() => {
	const server = createServer((req, res) => {
		const parsedUrl = parse(req.url || "", true);

		// Handle our custom broadcast endpoint
		if (req.url === "/api/broadcast-verification" && req.method === "POST") {
			let body = "";

			req.on("data", (chunk) => {
				body += chunk.toString();
			});

			req.on("end", async () => {
				try {
					const data = JSON.parse(body);
					const { userId, event, data: eventData } = data;

					if (event === "verification-status-update" && userId && eventData) {
						const verificationUpdate: VerificationUpdate = {
							userId,
							status: eventData.status,
							rejectionReason: eventData.rejectionReason,
							infoRequest: eventData.infoRequest,
							suspensionReason: eventData.suspensionReason,
							updatedAt: eventData.updatedAt,
						};

						const result =
							await broadcastVerificationUpdate(verificationUpdate);

						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify(result));
					} else {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(
							JSON.stringify({ success: false, error: "Invalid request data" })
						);
					}
				} catch (error) {
					console.error("Error processing broadcast request:", error);
					res.writeHead(500, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							success: false,
							error: error instanceof Error ? error.message : "Unknown error",
						})
					);
				}
			});

			return;
		}

		// Handle Next.js requests
		handle(req, res, parsedUrl);
	});

	// Initialize Socket.io with expanded CORS options
	const io = new SocketIOServer(server, {
		path: "/socket.io",
		cors: {
			origin: dev
				? "*"
				: [
						process.env.NEXT_PUBLIC_SITE_URL || "",
						process.env.NEXT_PUBLIC_ADDITIONAL_ORIGIN || "",
					].filter(Boolean),
			methods: ["GET", "POST"],
			credentials: true,
		},
		transports: ["polling", "websocket"],
	});

	// Set global IO instance
	globalIO = io;

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

		// Subscribe to user-specific updates
		socket.on("subscribe-user", async (userId) => {
			if (userId) {
				console.log(`User ${socket.id} subscribed as ${userId}`);
				socket.join(`user-${userId}`);

				// Send current verification status on subscription
				await emitCurrentVerificationStatus(userId);
			}
		});

		// Subscribe specifically to verification updates
		socket.on("subscribe-verification", (userId) => {
			if (userId) {
				console.log(
					`User ${socket.id} subscribed to verification updates for ${userId}`
				);
				socket.join(`verification-${userId}`);
			}
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
					timestamp: FieldValue.serverTimestamp(),
					readStatus: readStatus,
				});

				// Get the message data to emit to clients
				const messageData = {
					id: messageRef.id,
					sender: senderId,
					content: content,
					timestamp: clientTimestamp,
					conversationId: conversationId,
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

				// Check if this is the first message in the conversation
				const messagesSnapshot = await conversationRef
					.collection("messages")
					.get();
				const isFirstMessage = messagesSnapshot.size === 1; // Since we just added one

				// Emit the new message to all users in the conversation
				io.to(conversationId).emit("new-message", {
					...messageData,
					isNewConversation: isFirstMessage, // Add this flag
				});

				// If it's a new conversation, also emit a conversation-created event
				if (isFirstMessage) {
					// Emit to all participants
					conversationData?.participants.forEach((participantId: string) => {
						io.to(`user-${participantId}`).emit("conversation-created", {
							conversationId,
							participants: conversationData.participants,
							lastMessage: content,
							createdAt: clientTimestamp,
						});
					});
				}

				// For each participant, emit updated unread counts
				if (conversationData && conversationData.participants) {
					for (const participantId of conversationData.participants) {
						if (participantId !== senderId) {
							await emitUnreadCounts(participantId);
						}
					}
				}

				// Also emit a conversation update to all relevant users
				if (conversationData && conversationData.participants) {
					conversationData.participants.forEach((participantId: string) => {
						io.to(`user-${participantId}`).emit("conversation-updated", {
							conversationId,
							lastMessage: content,
							updatedAt: clientTimestamp,
							unreadCounts: conversationData.unreadCounts || {},
						});
					});
				}
			} catch (error) {
				console.error("Error handling message:", error);
				socket.emit("error", "Failed to send message");
			}
		});

		socket.on(
			"mark-read",
			async (data: { conversationId: string; userId: string }) => {
				try {
					const { conversationId, userId } = data;

					// Update the conversation document to reset unread count
					const conversationRef = db
						.collection("conversations")
						.doc(conversationId);
					await conversationRef.update({
						[`unreadCounts.${userId}`]: 0,
					});

					// Mark all messages as read in the database
					const messagesRef = conversationRef.collection("messages");
					const unreadMessages = await messagesRef
						.where(`readStatus.${userId}`, "==", false)
						.get();

					const batch = db.batch();
					unreadMessages.docs.forEach((doc) => {
						batch.update(doc.ref, {
							[`readStatus.${userId}`]: true,
						});
					});

					if (unreadMessages.size > 0) {
						await batch.commit();
					}

					// Emit updated unread counts to this user
					await emitUnreadCounts(userId);
				} catch (error) {
					console.error("Error marking as read:", error);
					socket.emit("error", "Failed to mark messages as read");
				}
			}
		);

		// Handle creator subscription
		socket.on("subscribe-creator-notifications", (creatorId) => {
			socket.join(`creator-${creatorId}`);
			console.log(`Creator ${creatorId} subscribed to notifications`);
		});

		// Handle brand sending notification
		socket.on("send-delivery-notification", (data) => {
			const { creatorId, ...notificationData } = data;

			// Emit to specific creator
			io.to(`creator-${creatorId}`).emit(
				"delivery-status-notification",
				notificationData
			);

			console.log(
				`Notification sent to creator ${creatorId}:`,
				notificationData
			);
		});

		// When brand users connect, they should join their room
		socket.on("join-brand-room", (brandUserId) => {
			socket.join(`brand-${brandUserId}`);
		});

		// When creators connect, they might join creator rooms
		socket.on("join-creator-room", (creatorId) => {
			socket.join(`creator-${creatorId}`);
		});

		socket.on("delivery-status-updated", (data) => {
			// Broadcast to all users subscribed to this project
			socket.broadcast.emit("delivery-status-updated", data);
		});

		socket.on("disconnect", () => {
			console.log("Client disconnected:", socket.id);
		});
	});

	// Helper function to emit unread counts to a specific user
	async function emitUnreadCounts(userId: string) {
		try {
			const conversationsRef = db.collection("conversations");
			const snapshot = await conversationsRef
				.where("participants", "array-contains", userId)
				.get();

			let totalUnread = 0;
			const conversationCounts: Record<string, number> = {};

			snapshot.docs.forEach((doc) => {
				const data = doc.data();
				const unreadCount = data.unreadCounts?.[userId] || 0;
				totalUnread += unreadCount;
				conversationCounts[doc.id] = unreadCount;
			});

			io.to(`user-${userId}`).emit("unread-counts-update", {
				totalUnread,
				conversationCounts,
			});
		} catch (error) {
			console.error("Error emitting unread counts:", error);
		}
	}

	// FIXED: Helper function to emit current verification status
	async function emitCurrentVerificationStatus(userId: string) {
		try {
			console.log(`Fetching verification status for userId: ${userId}`);

			// Query by userId field, not document ID
			const verificationQuery = await db
				.collection("creator_verifications")
				.where("userId", "==", userId)
				.orderBy("createdAt", "desc")
				.limit(1)
				.get();

			if (!verificationQuery.empty) {
				const verificationDoc = verificationQuery.docs[0];
				const data = verificationDoc.data();

				const statusUpdate = {
					status: data?.status || "pending",
					rejectionReason: data?.rejectionReason || null,
					infoRequest: data?.infoRequest || null,
					suspensionReason: data?.suspensionReason || null,
					updatedAt:
						data?.updatedAt?.toDate?.()?.toISOString() ||
						new Date().toISOString(),
				};

				io.to(`user-${userId}`).emit(
					"verification-status-update",
					statusUpdate
				);
				io.to(`verification-${userId}`).emit(
					"verification-status-update",
					statusUpdate
				);
				console.log(
					`Emitted current verification status for user ${userId}:`,
					statusUpdate
				);
			} else {
				console.log(`No verification found for userId: ${userId}`);
				// Emit a default status
				const defaultStatus = {
					status: "not_submitted",
					rejectionReason: null,
					infoRequest: null,
					suspensionReason: null,
					updatedAt: new Date().toISOString(),
				};
				io.to(`user-${userId}`).emit(
					"verification-status-update",
					defaultStatus
				);
			}
		} catch (error) {
			console.error("Error emitting verification status:", error);
		}
	}

	// FIXED: Function to broadcast verification status updates
	async function broadcastVerificationUpdate(update: VerificationUpdate) {
		try {
			const { userId, status, rejectionReason, infoRequest, suspensionReason } =
				update;
			console.log(
				`Broadcasting verification update for userId: ${userId}`,
				update
			);

			// First, find the verification document by userId
			const verificationQuery = await db
				.collection("creator_verifications")
				.where("userId", "==", userId)
				.orderBy("createdAt", "desc")
				.limit(1)
				.get();

			if (verificationQuery.empty) {
				console.error(`No verification document found for userId: ${userId}`);
				return { success: false, error: "Verification document not found" };
			}

			const verificationDoc = verificationQuery.docs[0];
			const verificationRef = verificationDoc.ref;

			// Prepare update data
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const updateData: any = {
				status,
				updatedAt: FieldValue.serverTimestamp(),
			};

			// Only add optional fields if they exist
			if (rejectionReason) updateData.rejectionReason = rejectionReason;
			if (infoRequest) updateData.infoRequest = infoRequest;
			if (suspensionReason) updateData.suspensionReason = suspensionReason;

			// Clear previous reason fields based on new status
			if (status !== "rejected")
				updateData.rejectionReason = FieldValue.delete();
			if (status !== "info_requested")
				updateData.infoRequest = FieldValue.delete();
			if (status !== "suspended")
				updateData.suspensionReason = FieldValue.delete();

			await verificationRef.update(updateData);

			// Prepare data for real-time broadcast
			const broadcastData = {
				status,
				rejectionReason: status === "rejected" ? rejectionReason : null,
				infoRequest: status === "info_requested" ? infoRequest : null,
				suspensionReason: status === "suspended" ? suspensionReason : null,
				updatedAt: new Date().toISOString(),
			};

			// Emit to both user-specific room and verification-specific room
			globalIO
				.to(`user-${userId}`)
				.emit("verification-status-update", broadcastData);
			globalIO
				.to(`verification-${userId}`)
				.emit("verification-status-update", broadcastData);

			console.log(
				`Successfully broadcasted verification update for user ${userId}:`,
				broadcastData
			);
			return { success: true, data: broadcastData };
		} catch (error) {
			console.error("Error broadcasting verification update:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
	}

	// Expose the broadcast function globally
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(global as any).broadcastVerificationUpdate = broadcastVerificationUpdate;

	server.listen(port, () => {
		console.log(`> Ready on http://localhost:${port}`);
		console.log(`> Socket.IO is running with configuration:`, {
			cors: io.engine.opts.cors,
			transports: io.engine.opts.transports,
			path: io.path(),
		});
	});
});

// Export for use in API routes
export { globalIO };

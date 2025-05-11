/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Send, Smile, Paperclip, ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams, useRouter } from "next/navigation";
import { useSocket } from "@/context/SocketContext";
import { useNotifications } from "@/context/NotificationContext";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BrandProfile {
	id: string;
	brandName: string;
	profilePictureUrl?: string;
	logoUrl?: string;
	username?: string;
}

type User = {
	timestamp: number;
	id: string;
	name: string;
	avatar: string;
	username?: string;
	lastMessage?: string;
	time?: string;
	isActive?: boolean;
	conversationId: string | null;
	unreadCount?: number;
	unreadCounts: number;
};

type Message = {
	id: string;
	sender: string;
	content: string;
	timestamp: any;
	date?: string;
	showAvatar?: boolean;
	isPinned?: boolean;
};

type Conversation = {
	id: string;
	participants: string[];
	participantsInfo?: Record<
		string,
		{ name: string; avatar: string; username?: string }
	>;
	lastMessage?: string;
	updatedAt?: any;
	unreadCounts: Record<string, number>;
};

const CreatorChatPage = () => {
	const { currentUser } = useAuth();
	const searchParams = useSearchParams();
	const router = useRouter();
	const conversationIdFromUrl = searchParams.get("conversation");
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const { setTotalUnreadCount } = useNotifications();
	const [sortOption, setSortOption] = useState("Newest");

	const handleSortChange = (option: "Newest" | "Oldest") => {
		setSortOption(option);

		// Resort users based on the selected option
		setUsers((prevUsers) => {
			const sortedUsers = [...prevUsers];

			sortedUsers.sort((a, b) => {
				// Use timestamp field which contains the numeric timestamp for reliable sorting
				const timeA = a.timestamp || 0;
				const timeB = b.timestamp || 0;

				// Sort based on selected option
				if (option === "Newest") {
					return timeB - timeA; // Newest first (descending)
				} else {
					return timeA - timeB; // Oldest first (ascending)
				}
			});

			return sortedUsers;
		});
	};


	// State variables
	const [brandProfiles, setBrandProfiles] = useState<
		Record<string, BrandProfile>
	>({});
	const [, setConversations] = useState<Conversation[]>([]);
	const [selectedConversation, setSelectedConversation] = useState<
		string | null
	>(conversationIdFromUrl);
	const [messages, setMessages] = useState<Message[]>([]);
	const [messageInput, setMessageInput] = useState("");
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [sendingMessage, setSendingMessage] = useState(false);


	const {
		joinConversation,
		leaveConversation,
		sendMessage: socketSendMessage,
		socket,
	} = useSocket();

	// Fetch brand profiles for all conversations
	const fetchBrandProfile = async (userId: string) => {
		try {
			const response = await fetch(
				`/api/admin/brand-approval?userId=${userId}`
			);

			if (response.ok) {
				const data = await response.json();
				setBrandProfiles((prev) => ({
					...prev,
					[userId]: data,
				}));
				return data;
			}
		} catch (error) {
			console.error(
				`Error fetching brand profile for userId ${userId}:`,
				error
			);
		}
		return null;
	};

	// Fetch total unread message count
	const fetchTotalUnreadCount = async () => {
		if (!currentUser) return;

		try {
			const response = await fetch(
				`/api/notifications/count?userId=${currentUser.uid}`
			);
			if (!response.ok) {
				throw new Error("Failed to fetch notification count");
			}

			const data = await response.json();

			// Update the context with the total unread count
			setTotalUnreadCount(data.totalUnread || 0);

			// Update individual conversation counts if provided
			if (data.conversationCounts) {
				setUsers((prev) =>
					prev.map((user) => {
						if (
							user.conversationId &&
							data.conversationCounts[user.conversationId] !== undefined
						) {
							return {
								...user,
								unreadCount: data.conversationCounts[user.conversationId],
							};
						}
						return user;
					})
				);
			}
		} catch (error) {
			console.error("Error fetching notification count:", error);
			// Set to 0 in case of error to avoid undefined
			setTotalUnreadCount(0);
		}
	};

	// Mark messages as read using socket
	const markMessagesAsReadSocket = (convId: string) => {
		if (!currentUser || !socket) return;

		// Emit the mark-read event through socket
		socket.emit("mark-read", {
			conversationId: convId,
			userId: currentUser.uid,
		});

		// Find the current unread count for this conversation
		const currentConvUnreadCount =
			users.find((user) => user.conversationId === convId)?.unreadCount || 0;

		// Optimistically update the UI immediately
		setUsers((prev) =>
			prev.map((user) => {
				if (user.conversationId === convId) {
					return { ...user, unreadCount: 0 };
				}
				return user;
			})
		);

		// Also update the total count in the context
		if (currentConvUnreadCount > 0) {
			setTotalUnreadCount((prevTotal) =>
				Math.max(0, prevTotal - currentConvUnreadCount)
			);
		}
	};

	// Fetch all conversations for current user
	useEffect(() => {
		if (!currentUser) return;

		const fetchConversations = async () => {
			try {
				setLoading(true);
				const response = await fetch(
					`/api/conversations?userId=${currentUser.uid}`
				);

				if (!response.ok) {
					throw new Error("Failed to fetch conversations");
				}

				const data = await response.json();
				setConversations(data.conversations);

				// Process conversations into user format for sidebar
				const processedUsers = data.conversations.map((conv: Conversation) => {
					// Find the other participant (not the current user)
					const otherParticipantId = conv.participants.find(
						(p: string) => p !== currentUser.uid
					);

					const participantInfo = otherParticipantId
						? conv.participantsInfo?.[otherParticipantId]
						: undefined;

					// Check if avatar is actually a valid URL or a path that's not just the default avatar
					const avatarUrl = participantInfo?.avatar || "";
					const isValidAvatar =
						avatarUrl &&
						(avatarUrl.startsWith("http") ||
							(avatarUrl !== "/icons/default-avatar.svg" &&
								avatarUrl.length > 0));

					// For each user, fetch their brand profile if not already fetched
					if (otherParticipantId && !brandProfiles[otherParticipantId]) {
						fetchBrandProfile(otherParticipantId);
					}

					// Get the unread count specifically for this conversation
					const unreadCount = conv.unreadCounts?.[currentUser.uid] || 0;

					// Store the actual timestamp for sorting purposes
					const timestamp = conv.updatedAt
						? new Date(conv.updatedAt).getTime()
						: 0;


					return {
						id: otherParticipantId || "",
						name: otherParticipantId
							? brandProfiles[otherParticipantId]?.brandName ||
								participantInfo?.name ||
								"Unknown User"
							: "Unknown User",
						avatar: isValidAvatar ? avatarUrl : "/icons/default-avatar.svg",
						username: participantInfo?.username || "",
						lastMessage: conv.lastMessage || "Start a conversation",
						time: conv.updatedAt
							? new Date(conv.updatedAt).toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})
							: "",
						conversationId: conv.id,
						timestamp: timestamp,
						unreadCount: unreadCount,
						unreadCounts: unreadCount,
					};
				});

				setUsers(processedUsers.filter((user: any) => user.id !== undefined));

				// If URL has conversation ID but not selected yet
				if (conversationIdFromUrl && !selectedConversation) {
					setSelectedConversation(conversationIdFromUrl);
				}

				// If no conversation selected but we have conversations, select the first one
				if (!selectedConversation && processedUsers.length > 0) {
					setSelectedConversation(processedUsers[0].conversationId);
				}

				setLoading(false);
			} catch (error) {
				console.error("Error fetching conversations:", error);
				setLoading(false);
			}
		};

		fetchConversations();
		fetchTotalUnreadCount();
	}, [currentUser, selectedConversation, conversationIdFromUrl, brandProfiles]);

	useEffect(() => {
		// Update user names when brandProfiles changes
		if (Object.keys(brandProfiles).length > 0) {
			setUsers((prevUsers) =>
				prevUsers.map((user) => ({
					...user,
					name: brandProfiles[user.id]?.brandName || user.name,
				}))
			);
		}
	}, [brandProfiles]);

	// Listen for socket events
	useEffect(() => {
		if (!selectedConversation || !socket || !currentUser) return;

		// Join the selected conversation room
		joinConversation(selectedConversation);

		// Listen for new messages
		const handleNewMessage = (message: any) => {
			setMessages((prev) => {
				// Check if we already have this message (to prevent duplicates)
				if (prev.some((m) => m.id === message.id)) return prev;

				// Check if we need to add a date separator
				const messageDate = new Date(message.timestamp).toLocaleDateString();
				const lastMessage = prev[prev.length - 1];
				const lastMessageDate = lastMessage?.timestamp
					? new Date(lastMessage.timestamp).toLocaleDateString()
					: null;

				const newMessages = [...prev];

				// If this message is from another user and it's not in the currently selected conversation
				if (
					message.sender !== currentUser?.uid &&
					message.conversationId !== selectedConversation
				) {
					// Update the unread count for this specific conversation
					setUsers((prevUsers) =>
						prevUsers.map((user) =>
							user.conversationId === message.conversationId
								? { ...user, unreadCount: (user.unreadCount || 0) + 1 }
								: user
						)
					);

					// Update total unread count
					setTotalUnreadCount((prev) => (prev || 0) + 1);

					// Fetch the latest total from API to ensure consistency
					fetchTotalUnreadCount();
				}

				// Add date separator if needed
				if (lastMessageDate && messageDate !== lastMessageDate) {
					newMessages.push({
						id: `date-${messageDate}`,
						sender: "system",
						content: messageDate,
						timestamp: null,
						date: messageDate,
					});
				}

				// Add the new message
				newMessages.push({
					id: message.id,
					sender: message.sender,
					content: message.content,
					timestamp: new Date(message.timestamp),
					showAvatar: message.sender !== currentUser?.uid,
				});

				return newMessages;
			});

			// Scroll to bottom
			setTimeout(() => {
				if (scrollAreaRef.current) {
					const scrollArea = scrollAreaRef.current;
					scrollArea.scrollTop = scrollArea.scrollHeight;
				}
			}, 100);
		};

		// Listen for conversation updates
		const handleConversationUpdated = (data: any) => {
			// Update conversations list with updated unread counts
			setConversations((prev) =>
				prev.map((conv) =>
					conv.id === data.conversationId
						? {
								...conv,
								lastMessage: data.lastMessage,
								updatedAt: new Date(data.updatedAt),
								unreadCounts: data.unreadCounts || conv.unreadCounts,
							}
						: conv
				)
			);

			// Update users list with updated unread counts
			setUsers((prev) =>
				prev.map((user) => {
					if (user.conversationId === data.conversationId) {
						const newUnreadCount =
							data.unreadCounts && currentUser
								? data.unreadCounts[currentUser.uid] || 0
								: user.unreadCount || 0;

						return {
							...user,
							lastMessage: data.lastMessage,
							time: new Date(data.updatedAt).toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							}),
							unreadCount: newUnreadCount,
						};
					}
					return user;
				})
			);

			// Instead of calculating our own total, fetch the latest total from API
			fetchTotalUnreadCount();
		};

		const handleUnreadCountsUpdate = (data: any) => {
			if (!data || !currentUser) return;

			// Update total unread count with the API-provided value if available
			if (typeof data.totalUnread === "number") {
				// Always use the API value as the source of truth
				setTotalUnreadCount(data.totalUnread);
			} else if (
				data.conversationCounts &&
				typeof data.conversationCounts === "object"
			) {
				// Calculate total from conversation counts if totalUnread is not provided
				const calculatedTotal = Object.values(data.conversationCounts).reduce(
					(sum: number, count: any) => sum + (Number(count) || 0),
					0
				);
				setTotalUnreadCount(calculatedTotal);
			}

			// Update individual conversation unread counts
			if (
				data.conversationCounts &&
				typeof data.conversationCounts === "object"
			) {
				setUsers((prev) =>
					prev.map((user) => {
						if (
							user.conversationId &&
							data.conversationCounts[user.conversationId] !== undefined
						) {
							return {
								...user,
								unreadCount: data.conversationCounts[user.conversationId],
							};
						}
						return user;
					})
				);
			}
		};

		socket.on("new-message", handleNewMessage);
		socket.on("conversation-updated", handleConversationUpdated);
		socket.on("unread-counts-update", handleUnreadCountsUpdate);

		// Clean up when unmounting
		return () => {
			leaveConversation(selectedConversation);
			socket.off("new-message", handleNewMessage);
			socket.off("conversation-updated", handleConversationUpdated);
			socket.off("unread-counts-update", handleUnreadCountsUpdate);
		};
	}, [
		selectedConversation,
		socket,
		currentUser,
		joinConversation,
		leaveConversation,
	]);

	// Initial fetch of messages still needed when first loading a conversation
	useEffect(() => {
		if (!selectedConversation || !currentUser) return;

		const fetchInitialMessages = async () => {
			try {
				const response = await fetch(
					`/api/messages?conversationId=${selectedConversation}`
				);

				if (!response.ok) {
					throw new Error("Failed to fetch messages");
				}

				const data = await response.json();

				// Process messages
				const processedMessages: Message[] = [];
				let currentDate = "";

				data.messages.forEach((msg: any, index: number) => {
					// Format the timestamp
					let formattedDate = "";
					if (msg.timestamp) {
						const date = new Date(msg.timestamp);
						formattedDate = date.toLocaleDateString();
					}

					if (formattedDate && formattedDate !== currentDate) {
						currentDate = formattedDate;

						// Add date marker
						if (index > 0) {
							processedMessages.push({
								id: `date-${currentDate}`,
								sender: "system",
								content: currentDate,
								timestamp: null,
								date: currentDate,
							});
						}
					}

					processedMessages.push({
						id: msg.id,
						sender: msg.sender || "unknown",
						content: msg.content || "",
						timestamp: msg.timestamp ? new Date(msg.timestamp) : null,
						date: formattedDate,
						showAvatar: msg.sender !== currentUser.uid,
					});
				});

				setMessages(processedMessages);

				// Scroll to bottom after messages load
				setTimeout(() => {
					if (scrollAreaRef.current) {
						const scrollArea = scrollAreaRef.current;
						scrollArea.scrollTop = scrollArea.scrollHeight;
					}
				}, 100);
			} catch (error) {
				console.error("Error fetching messages:", error);
			}
		};

		fetchInitialMessages();
	}, [selectedConversation, currentUser]);

	// Find selected user for header display
	const selectedUser =
		users.find((u) => u.conversationId === selectedConversation) || null;

	// Handle sending a new message using the API endpoint
	const handleSendMessage = async () => {
		if (
			!messageInput.trim() ||
			!selectedConversation ||
			!currentUser ||
			sendingMessage
		)
			return;

		try {
			setSendingMessage(true);
			setMessageInput("");

			// Scroll to bottom
			setTimeout(() => {
				if (scrollAreaRef.current) {
					const scrollArea = scrollAreaRef.current;
					scrollArea.scrollTop = scrollArea.scrollHeight;
				}
			}, 100);

			// Send message via socket instead of REST API
			socketSendMessage(selectedConversation, messageInput);
		} catch (error) {
			console.error("Error sending message:", error);
		} finally {
			setSendingMessage(false);
		}
	};

	// Handle conversation selection
	const handleSelectConversation = (conversationId: string) => {
		// If clicking the same conversation that's already selected, don't clear messages
		if (selectedConversation !== conversationId) {
			setMessages([]); // Clear messages only when switching to a different conversation
		}
		
		setSelectedConversation(conversationId);
		
		// Mark messages as read using socket
		markMessagesAsReadSocket(conversationId);
		
		// Update URL without full page reload
		router.push(`/creator/dashboard/messages?conversation=${conversationId}`, {
			scroll: false,
		});
	};

	// Filter users based on search query
	const filteredUsers = users.filter((user) => {
		const matchesSearch =
			user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(user.username &&
				user.username.toLowerCase().includes(searchQuery.toLowerCase()));
		return matchesSearch;
	});

	if (!currentUser) {
		return (
			<div className="flex items-center justify-center h-screen">
				Please log in to access messages
			</div>
		);
	}

	return (
		<div className="flex h-screen bg-white w-[calc(100vw-16rem)]">
			{/* Left sidebar */}
			<div className="w-72 border-r flex flex-col">
				{/* Search and filters */}
				<div className="p-4">
					<div className="relative mb-3">
						<Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
						<Input
							placeholder="Search conversations..."
							className="pl-8 bg-gray-100 border-0"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				</div>

				{/* Sort options */}
				<div className="px-4 py-2 text-sm text-gray-500 flex items-center mb-2">
					<span>Sort by:</span>
					<DropdownMenu>
						<DropdownMenuTrigger className="ml-1 outline-none">
							<span className="text-orange-600 font-medium flex items-center">
								{sortOption}
								<ChevronDown className="h-4 w-4 ml-1" />
							</span>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="bg-white">
							<DropdownMenuItem onClick={() => handleSortChange("Newest")}>
								Newest
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleSortChange("Oldest")}>
								Oldest
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* User list */}
				<ScrollArea className="flex-1">
					{loading ? (
						<div className="flex justify-center p-4">
							<div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-600"></div>
						</div>
					) : filteredUsers.length === 0 ? (
						<div className="p-4 text-center text-gray-500">
							No conversations yet
						</div>
					) : (
						filteredUsers.map((user) => (
							<div
								key={user.id}
								className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 ${
									selectedConversation === user.conversationId
										? "bg-orange-50 border-l-4 border-orange-600"
										: ""
								}`}
								onClick={() =>
									user.conversationId &&
									handleSelectConversation(user.conversationId)
								}
							>
								<div className="relative">
									<Avatar className="">
										<Image
											src={
												brandProfiles[user.id]?.logoUrl ||
												(user.avatar &&
												user.avatar !== "/icons/default-avatar.svg"
													? user.avatar
													: "/icons/default-avatar.svg")
											}
											alt="Profile"
											width={60}
											height={60}
										/>
									</Avatar>
									{user.isActive && (
										<div className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white"></div>
									)}
								</div>
								<div className="ml-3 flex-1 overflow-hidden">
									<div className="flex justify-between items-center">
										<div className="flex gap-2">
											<p className="text-base font-medium truncate">
												{user.name}
											</p>
											{(user.unreadCount ?? 0) > 0 && (
												<span className="bg-orange-500 text-white text-xs rounded-full h-4 w-4 mt-1 flex items-center justify-center">
													{(user.unreadCount ?? 0) > 9
														? "9+"
														: (user.unreadCount ?? 0)}
												</span>
											)}
										</div>
										<p className="text-xs text-gray-500">{user.time}</p>
									</div>

									<p className="text-sm text-gray-500 truncate mt-0.5">
										{user.lastMessage}
									</p>
								</div>
							</div>
						))
					)}
				</ScrollArea>
			</div>

			{/* Main chat area */}
			<div className="flex-1 flex flex-col">
				{/* Chat header */}
				{selectedUser ? (
					<div className="py-3 px-4 border-b flex justify-between items-center">
						<div className="flex items-center">
							<Avatar className="">
								<Image
									src={
										(selectedUser && brandProfiles[selectedUser.id]?.logoUrl) ||
										(selectedUser?.avatar &&
										selectedUser.avatar !== "/icons/default-avatar.svg"
											? selectedUser.avatar
											: "/icons/default-avatar.svg")
									}
									alt="Profile"
									width={60}
									height={60}
								/>
							</Avatar>

							<div className="ml-3">
								<p className="text-base font-medium">{selectedUser.name}</p>
								{selectedUser.username && (
									<p className="text-xs text-orange-600">
										@{selectedUser.username}
									</p>
								)}
							</div>
						</div>
					</div>
				) : (
					<div className="py-3 px-4 border-b">
						<p className="text-base font-medium">Select a conversation</p>
					</div>
				)}

				{/* Messages area */}
				<div className="flex-1 p-4 overflow-auto" ref={scrollAreaRef}>
					<div className="space-y-6">
						{/* Welcome message for empty conversations */}
						{messages.length === 0 && !loading && selectedUser && (
							<div className="flex justify-center items-center text-center bg-orange-50 text-orange-800 px-4 py-3 rounded-lg text-base">
								{selectedUser.lastMessage && selectedUser.lastMessage !== "Start a conversation"
									? "Loading conversation..."
									: `Start a conversation with ${selectedUser?.name}`}
							</div>
						)}

						{/* Loading indicator for messages */}
						{loading && (
							<div className="flex justify-center p-4">
								<div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-600"></div>
							</div>
						)}

						{messages.map((message) => (
							<div key={message.id} className="space-y-1">
								{message.date && message.sender === "system" && (
									<div className="flex justify-center my-4">
										<div className="flex items-center justify-center my-4">
											<div className="text-xs text-gray-500 relative flex items-center">
												<span className="inline-block h-px w-80 bg-gray-200 mr-2"></span>
												{message.date}
												<span className="inline-block h-px w-80 bg-gray-200 ml-2"></span>
											</div>
										</div>
									</div>
								)}

								{message.sender !== "system" && (
									<div
										className={`flex ${message.sender === currentUser?.uid ? "justify-end" : "justify-start"}`}
									>
										<div
											className={`max-w-3xl ${message.sender === currentUser?.uid ? "order-2" : "order-1"}`}
										>
											<div className="flex items-start">
												{message.showAvatar &&
													message.sender !== currentUser?.uid && (
														<Avatar className="h-8 w-8 mt-1 mr-3">
															<Image
																src={
																	(message.sender !== currentUser?.uid &&
																		brandProfiles[message.sender]?.logoUrl) ||
																	(selectedUser?.avatar &&
																	selectedUser.avatar !==
																		"/icons/default-avatar.svg"
																		? selectedUser.avatar
																		: "/icons/default-avatar.svg")
																}
																alt="Profile"
																width={60}
																height={60}
															/>
														</Avatar>
													)}
												<div className="space-y-1">
													<div
														className={`whitespace-pre-line px-4 py-3 rounded-lg text-sm ${
															message.sender === currentUser?.uid
																? "bg-orange-100 text-orange-800"
																: "bg-gray-100 border-gray-200 border"
														}`}
													>
														{message.content}
													</div>
													<div
														className={`flex text-xs text-gray-500 ${message.sender === currentUser?.uid ? "justify-end" : "justify-start"}`}
													>
														{message.timestamp
															? message.timestamp.toLocaleTimeString([], {
																	hour: "2-digit",
																	minute: "2-digit",
																})
															: ""}
													</div>
												</div>
											</div>
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				</div>

				{/* Message input area */}
				<div className="border-t p-4 flex items-center">
					<Paperclip className="h-5 w-5 text-gray-400 mr-2 cursor-pointer hover:text-orange-500" />
					<Input
						placeholder="Type your message here..."
						className="flex-1"
						value={messageInput}
						onChange={(e) => setMessageInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								handleSendMessage();
							}
						}}
						disabled={sendingMessage || !selectedUser}
					/>
					<div className="flex items-center ml-2">
						<Smile className="h-5 w-5 text-gray-400 mx-2 cursor-pointer hover:text-orange-500" />
						<button
							className={`${
								!selectedUser || sendingMessage || !messageInput.trim()
									? "bg-gray-100 text-gray-400"
									: "bg-orange-600 text-white hover:bg-orange-700"
							} rounded-full p-2 transition-colors`}
							onClick={handleSendMessage}
							disabled={sendingMessage || !selectedUser || !messageInput.trim()}
						>
							{sendingMessage ? (
								<div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
							) : (
								<Send className="h-5 w-5" />
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CreatorChatPage;

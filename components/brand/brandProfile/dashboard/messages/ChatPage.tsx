/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import {
	Search,
	Send,
	Smile,
	Paperclip,
	ChevronDown,
	ImageIcon,
	X,
	Menu,
} from "lucide-react";
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
import { commonEmojis } from "@/types/emojis";

type User = {
	timestamp: number;
	conversationId: string | null;
	id: string;
	name: string;
	avatar: string;
	lastMessage?: string;
	time?: string;
	isActive?: boolean;
	username?: string;
	unreadCounts: number;
	unreadCount?: number;
	creator: string;
	creatorProfile?: {
		avatarUrl: string | null;
		displayName: string | null;
	};
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
	unreadCounts: Record<string, number>;
	id: string;
	participants: string[];
	participantsInfo?: Record<
		string,
		{ name: string; avatar: string; username?: string }
	>;
	lastMessage?: string;
	updatedAt?: any;
	creatorProfile?: {
		avatarUrl: string | null;
		displayName: string | null;
	};
};

const ChatPage = () => {
	const { currentUser } = useAuth();
	const searchParams = useSearchParams();
	const router = useRouter();
	const conversationIdFromUrl = searchParams.get("conversation");
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	// State variables
	const [, setConversations] = useState<Conversation[]>([]);
	const [selectedConversation, setSelectedConversation] = useState<
		string | null
	>(conversationIdFromUrl);
	const [messages, setMessages] = useState<Message[]>([]);
	const [messageInput, setMessageInput] = useState("");
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [sendingMessage, setSendingMessage] = useState(false);
	const { setTotalUnreadCount } = useNotifications();
	const [sortOption, setSortOption] = useState("Newest");
	const [searchQuery, setSearchQuery] = useState("");
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const emojiPickerRef = useRef<HTMLDivElement>(null);
	const [showSidebar, setShowSidebar] = useState(false);

	// Handle emoji selection
	const handleEmojiSelect = (emoji: string) => {
		setMessageInput((prev) => prev + emoji);
		setShowEmojiPicker(false);
	};

	// Handle file selection
	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files || []);
		setSelectedFiles((prev) => [...prev, ...files]);
	};

	// Remove selected file
	const removeFile = (index: number) => {
		setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
	};

	// Close emoji picker when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				emojiPickerRef.current &&
				!emojiPickerRef.current.contains(event.target as Node)
			) {
				setShowEmojiPicker(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

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

	const filteredUsers = users.filter((user) => {
		// If search query is empty, show all users
		if (!searchQuery.trim()) return true;

		// Search in name, username, and last message
		const searchTermLower = searchQuery.toLowerCase();

		return (
			// Search in name
			user.name.toLowerCase().includes(searchTermLower) ||
			// Search in username (if available)
			(user.username &&
				user.username.toLowerCase().includes(searchTermLower)) ||
			(user.creator && user.creator.toLowerCase().includes(searchTermLower)) ||
			// Search in last message
			(user.lastMessage &&
				user.lastMessage.toLowerCase().includes(searchTermLower))
		);
	});

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

				// In your fetchConversations function, update the processedUsers mapping:
				const processedUsers = data.conversations.map((conv: Conversation) => {
					const otherParticipantId = conv.participants.find(
						(p: string) => p !== currentUser.uid
					);

					const participantInfo = otherParticipantId
						? conv.participantsInfo?.[otherParticipantId]
						: undefined;

					// Get the unread count specifically for this conversation
					const unreadCount = conv.unreadCounts?.[currentUser.uid] || 0;

					// Store the actual timestamp for sorting purposes
					const timestamp = conv.updatedAt
						? new Date(conv.updatedAt).getTime()
						: 0;

					return {
						id: otherParticipantId || "",
						name: participantInfo?.name || "Unknown User",
						avatar: participantInfo?.avatar || "/icons/default-avatar.svg",
						username: participantInfo?.username || "",
						lastMessage: conv.lastMessage || "Start a conversation",
						time: conv.updatedAt
							? new Date(conv.updatedAt).toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})
							: "",
						timestamp: timestamp,
						conversationId: conv.id,
						unreadCount: unreadCount, // Use the specific unread count for this conversation
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
	}, [currentUser, selectedConversation, conversationIdFromUrl]);

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

	const {
		joinConversation,
		leaveConversation,
		sendMessage: socketSendMessage,
		socket,
	} = useSocket();

	// Listen for socket events
	useEffect(() => {
		if (!selectedConversation || !socket || !currentUser) return;

		// Join the selected conversation room
		joinConversation(selectedConversation);

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

		// In the cleanup function, remove:
		socket.off("unread-counts-update", handleUnreadCountsUpdate);

		// Clean up when unmounting
		return () => {
			leaveConversation(selectedConversation);
			socket.off("new-message", handleNewMessage);
			socket.off("conversation-updated", handleConversationUpdated);
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
			(!messageInput.trim() && selectedFiles.length === 0) ||
			!selectedConversation ||
			!currentUser ||
			sendingMessage
		)
			return;

		try {
			setSendingMessage(true);

			// If there are files, you'll need to upload them first
			if (selectedFiles.length > 0) {
				// Handle file upload logic here
				// You'll need to implement file upload to your storage service
				console.log("Files to upload:", selectedFiles);
				// After upload, include file URLs in the message
			}

			// Send message via socket
			socketSendMessage(selectedConversation, messageInput);

			// Clear input and files
			setMessageInput("");
			setSelectedFiles([]);

			// Scroll to bottom
			setTimeout(() => {
				if (scrollAreaRef.current) {
					scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
				}
			}, 100);
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
		router.push(`/brand/dashboard/messages?conversation=${conversationId}`, {
			scroll: false,
		});
	};
	if (!currentUser) {
		return (
			<div className="flex items-center justify-center h-screen">
				Please log in to access messages
			</div>
		);
	}

	
	return (
		<div className="flex h-screen bg-white">
			{/* Mobile overlay backdrop */}
			{showSidebar && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
					onClick={() => setShowSidebar(false)}
				/>
			)}

			{/* Left sidebar */}
			<div
				className={`
		${showSidebar ? "translate-x-0" : "-translate-x-full"} 
		lg:translate-x-0 
		fixed lg:relative 
		left-0 top-0 
		w-72 sm:w-80 
		h-full 
		border-r 
		flex flex-col 
		bg-white 
		z-50 lg:z-auto
		transition-transform duration-300 ease-in-out
	`}
			>
				{/* Mobile close button */}
				<div className="lg:hidden flex justify-between items-center p-4 border-b">
					<h2 className="text-lg font-semibold">Conversations</h2>
					<button
						onClick={() => setShowSidebar(false)}
						className="p-2 hover:bg-gray-100 rounded-full"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Search bar */}
				<div className="p-4">
					<div className="relative">
						<Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
						<Input
							placeholder="Search..."
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
							<div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-500"></div>
						</div>
					) : filteredUsers.length === 0 ? (
						<div className="p-4 text-center text-gray-500">
							No conversations yet
						</div>
					) : (
						filteredUsers.map((user) => (
							<div
								key={user.id}
								className={`flex items-center p-3 sm:p-4 cursor-pointer hover:bg-gray-50 ${
									selectedConversation === user.conversationId
										? "bg-orange-50 border-l-4 border-orange-600"
										: ""
								}`}
								onClick={() => {
									if (user.conversationId) {
										handleSelectConversation(user.conversationId);
										// Close sidebar on mobile after selecting
										if (window.innerWidth < 1024) {
											setShowSidebar(false);
										}
									}
								}}
							>
								<div className="relative">
									<Avatar className="h-10 w-10 sm:h-12 sm:w-12">
										<Image
											src={
												user.creatorProfile?.avatarUrl ||
												user.avatar ||
												"/icons/default-avatar.svg"
											}
											alt="Profile"
											width={60}
											height={60}
										/>
									</Avatar>
									{user.isActive && (
										<div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-orange-500 border-2 border-white"></div>
									)}
								</div>
								<div className="ml-3 flex-1 overflow-hidden min-w-0">
									<div className="flex justify-between items-center">
										<div className="flex gap-2 items-center min-w-0">
											<p className="text-sm sm:text-base font-medium truncate">
												{user.creatorProfile?.displayName || user.name}
											</p>
											{(user.unreadCount ?? 0) > 0 && (
												<span className="bg-orange-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center flex-shrink-0">
													{(user.unreadCount ?? 0) > 9
														? "9+"
														: (user.unreadCount ?? 0)}
												</span>
											)}
										</div>
										<p className="text-xs sm:text-sm text-gray-500 flex-shrink-0 ml-2">
											{user.time}
										</p>
									</div>
									<div className="flex justify-between items-center">
										<p className="text-xs sm:text-sm text-gray-500 line-clamp-1">
											{user.lastMessage}
										</p>
									</div>
								</div>
							</div>
						))
					)}
				</ScrollArea>
			</div>

			{/* Main chat area */}
			<div className="flex-1 flex flex-col h-full min-w-0">
				{/* Chat header - fixed height */}
				{selectedUser ? (
					<div className="py-3 px-4 border-b flex items-center flex-shrink-0 bg-white">
						{/* Mobile menu button */}
						<button
							onClick={() => setShowSidebar(true)}
							className="lg:hidden mr-3 p-2 hover:bg-gray-100 rounded-full"
						>
							<Menu className="h-5 w-5" />
						</button>

						<Avatar className="h-10 w-10 sm:h-12 sm:w-12">
							<Image
								src={
									selectedUser.creatorProfile?.avatarUrl ||
									selectedUser.avatar ||
									"/icons/default-avatar.svg"
								}
								alt="Profile"
								width={60}
								height={60}
							/>
						</Avatar>
						<div className="ml-3 min-w-0 flex-1">
							<p className="text-sm sm:text-base font-medium truncate">
								{selectedUser.creatorProfile?.displayName || selectedUser.name}
							</p>
							{selectedUser.username && (
								<p className="text-xs sm:text-sm text-orange-500 truncate">
									@{selectedUser.username}
								</p>
							)}
						</div>
					</div>
				) : (
					<div className="py-3 px-4 border-b flex-shrink-0 bg-white flex items-center">
						{/* Mobile menu button */}
						<button
							onClick={() => setShowSidebar(true)}
							className="lg:hidden mr-3 p-2 hover:bg-gray-100 rounded-full"
						>
							<Menu className="h-5 w-5" />
						</button>
						<p className="text-sm sm:text-base font-medium">
							Select a conversation
						</p>
					</div>
				)}

				{/* Messages area - flexible height with bottom padding for fixed input */}
				<div className="flex-1 overflow-hidden">
					<ScrollArea className="h-full">
						<div className="p-3 sm:p-4 space-y-4 sm:space-y-6 pb-32 sm:pb-36">
							{/* Welcome message for empty conversations */}
							{messages.length === 0 && !loading && selectedUser && (
								<div className="flex justify-center items-center text-center bg-orange-50 text-orange-800 px-4 py-3 rounded-lg text-sm sm:text-base">
									{selectedUser.lastMessage &&
									selectedUser.lastMessage !== "Start a conversation"
										? "Loading conversation..."
										: `Start a conversation with ${selectedUser?.name}`}
								</div>
							)}

							{/* Loading indicator for messages */}
							{loading && (
								<div className="flex justify-center p-4">
									<div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-500"></div>
								</div>
							)}

							{messages.map((message) => (
								<div key={message.id} className="space-y-1">
									{message.date && message.sender === "system" && (
										<div className="flex justify-center my-4">
											<div className="flex items-center justify-center my-4">
												<div className="text-xs text-gray-500 relative flex items-center">
													<span className="inline-block h-px w-16 sm:w-80 bg-gray-200 mr-2"></span>
													{message.date}
													<span className="inline-block h-px w-16 sm:w-80 bg-gray-200 ml-2"></span>
												</div>
											</div>
										</div>
									)}

									{message.sender !== "system" && (
										<div
											className={`flex ${message.sender === currentUser?.uid ? "justify-end" : "justify-start"}`}
										>
											<div
												className={`max-w-[85%] sm:max-w-3xl ${message.sender === currentUser?.uid ? "order-2" : "order-1"}`}
											>
												<div className="flex items-start">
													{message.showAvatar &&
														message.sender !== currentUser?.uid && (
															<Avatar className="h-6 w-6 sm:h-8 sm:w-8 mt-1 mr-2 sm:mr-3 flex-shrink-0">
																<Image
																	src={
																		selectedUser?.creatorProfile?.avatarUrl ||
																		selectedUser?.avatar ||
																		"/icons/default-avatar.svg"
																	}
																	alt="Profile"
																	width={60}
																	height={60}
																/>
															</Avatar>
														)}
													<div className="space-y-1 min-w-0">
														<div
															className={`whitespace-pre-line px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm ${
																message.sender === currentUser?.uid
																	? "bg-orange-100 text-orange-800"
																	: "bg-[#F9FAFB] border-[#EAECF0] border"
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
					</ScrollArea>
				</div>

				{/* Message input area - Fixed at bottom */}
				<div className="border-t bg-white flex-shrink-0 fixed bottom-0 left-64 right-0 lg:left-[35.8rem] z-40">
					{/* File preview area */}
					{selectedFiles.length > 0 && (
						<div className="p-3 border-b bg-gray-50">
							<div className="flex flex-wrap gap-2">
								{selectedFiles.map((file, index) => (
									<div
										key={index}
										className="relative bg-white border rounded-lg p-2 flex items-center space-x-2"
									>
										<ImageIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
										<span className="text-sm text-gray-600 max-w-[80px] sm:max-w-[100px] truncate">
											{file.name}
										</span>
										<button
											onClick={() => removeFile(index)}
											className="text-gray-400 hover:text-red-500 flex-shrink-0"
										>
											<X className="h-4 w-4" />
										</button>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Input area */}
					<div className="p-3 sm:p-4 flex items-end space-x-2 relative">
						{/* File input */}
						<input
							ref={fileInputRef}
							type="file"
							multiple
							accept="image/*,video/*,.pdf,.doc,.docx"
							onChange={handleFileSelect}
							className="hidden"
						/>

						{/* Paperclip button */}
						<button
							onClick={() => fileInputRef.current?.click()}
							className="text-gray-400 hover:text-orange-500 p-1 flex-shrink-0"
						>
							<Paperclip className="h-5 w-5" />
						</button>

						{/* Message input */}
						<div className="flex-1 relative min-w-0">
							<Input
								placeholder="Type your message here..."
								className="pr-10 resize-none min-h-[40px] max-h-[120px] text-sm sm:text-base"
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
						</div>

						{/* Emoji picker */}
						<div className="relative flex-shrink-0" ref={emojiPickerRef}>
							<button
								onClick={() => setShowEmojiPicker(!showEmojiPicker)}
								className="text-gray-400 hover:text-orange-500 p-1"
							>
								<Smile className="h-5 w-5" />
							</button>

							{/* Emoji picker dropdown */}
							{showEmojiPicker && (
								<div className="absolute bottom-full right-0 mb-2 bg-white border rounded-lg shadow-lg p-3 w-48 sm:w-64 max-h-48 overflow-y-auto z-50">
									<div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
										{commonEmojis.map((emoji, index) => (
											<button
												key={index}
												onClick={() => handleEmojiSelect(emoji)}
												className="p-1 hover:bg-gray-100 rounded text-base sm:text-lg"
											>
												{emoji}
											</button>
										))}
									</div>
								</div>
							)}
						</div>

						{/* Send button */}
						<button
							className={`${
								!selectedUser ||
								sendingMessage ||
								(!messageInput.trim() && selectedFiles.length === 0)
									? "bg-gray-100 text-gray-400"
									: "bg-orange-600 text-white hover:bg-orange-700"
							} rounded-full p-2 transition-colors flex-shrink-0`}
							onClick={handleSendMessage}
							disabled={
								sendingMessage ||
								!selectedUser ||
								(!messageInput.trim() && selectedFiles.length === 0)
							}
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

export default ChatPage;

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { useMessaging } from "@/context/MessagingContext";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { commonEmojis } from "@/types/emojis";

// Skeleton Loading Components
const ConversationSkeleton = () => (
	<div className="flex items-center p-2.5 sm:p-3 md:p-4 mx-1 sm:mx-2 rounded-lg animate-pulse">
		<div className="relative flex-shrink-0">
			<div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 bg-gray-200 rounded-full ring-2 ring-gray-100" />
		</div>
		<div className="ml-2 sm:ml-3 flex-1 overflow-hidden min-w-0">
			<div className="flex justify-between items-start mb-0.5 sm:mb-1">
				<div className="flex gap-1.5 sm:gap-2 items-center min-w-0 flex-1">
					<div className="h-4 sm:h-5 bg-gray-200 rounded w-24 sm:w-32" />
				</div>
				<div className="h-3 bg-gray-200 rounded w-8 sm:w-10 flex-shrink-0 ml-2" />
			</div>
			<div className="space-y-1">
				<div className="h-3 bg-gray-200 rounded w-full" />
				<div className="h-3 bg-gray-200 rounded w-3/4" />
			</div>
		</div>
	</div>
);

// const MessagesSkeleton = () => (
// 	<div className="p-3 sm:p-4 md:p-6 space-y-4">
// 		{[...Array(3)].map((_, i) => (
// 			<div key={i} className="flex justify-start">
// 				<div className="max-w-[90%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[65%] xl:max-w-[60%]">
// 					<div className="flex items-start animate-pulse">
// 						<div className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 mt-1 mr-2 sm:mr-3 flex-shrink-0">
// 							<div className="h-full w-full bg-gray-200 rounded-full" />
// 						</div>
// 						<div className="space-y-1 min-w-0 flex-1">
// 							<div className="bg-gray-200 rounded-lg h-12 sm:h-16 w-48 sm:w-64 md:w-80" />
// 							<div className="h-3 bg-gray-200 rounded w-16" />
// 						</div>
// 					</div>
// 				</div>
// 			</div>
// 		))}
// 	</div>
// );

const HeaderSkeleton = () => (
	<div className="py-2 sm:py-3 px-3 sm:px-4 border-b flex items-center flex-shrink-0 bg-white shadow-sm">
		<div className="relative flex-shrink-0 animate-pulse">
			<div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 bg-gray-200 rounded-full ring-2 ring-gray-100" />
		</div>
		<div className="ml-2 sm:ml-3 min-w-0 flex-1 animate-pulse">
			<div className="space-y-1">
				<div className="h-4 sm:h-5 md:h-6 bg-gray-200 rounded w-32 sm:w-40 md:w-48" />
				<div className="h-3 sm:h-4 bg-gray-200 rounded w-20 sm:w-24 md:w-28" />
			</div>
		</div>
	</div>
);

const LoadingSpinner = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
	const sizeClasses = {
		sm: "h-4 w-4",
		md: "h-5 w-5 sm:h-6 sm:w-6",
		lg: "h-6 w-6 sm:h-8 sm:w-8",
	};

	return (
		<div className="flex justify-center p-4 sm:p-6">
			<div
				className={`${sizeClasses[size]} border-2 border-t-transparent border-orange-500 rounded-full animate-spin`}
			/>
		</div>
	);
};

const ChatPage = () => {
	const { currentUser } = useAuth();
	const searchParams = useSearchParams();
	const router = useRouter();
	const conversationIdFromUrl = searchParams.get("conversation");
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	// Get everything from context
	const {
		users,
		messages,
		selectedConversation,
		imageLoadingStates,
		sortOption,
		searchQuery,
		loading,
		setUsers,
		setMessages,
		setSelectedConversation,
		setSearchQuery,
		handleSelectConversation,
		handleSortChange,
		handleImageLoad,
		handleImageLoadStart,
		fetchInitialMessages,
		refreshConversations,
		setConversations,
	} = useMessaging();

	// Local state for chat-specific functionality
	const [messageInput, setMessageInput] = useState("");
	const [sendingMessage, setSendingMessage] = useState(false);
	const { setTotalUnreadCount } = useNotifications();
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

	useEffect(() => {
		const refreshParam = searchParams.get("refresh");
		if (refreshParam && conversationIdFromUrl) {
			// This indicates a new conversation was just created
			refreshConversations();

			// Clean up the URL by removing the refresh parameter
			const newUrl = new URL(window.location.href);
			newUrl.searchParams.delete("refresh");
			router.replace(newUrl.pathname + newUrl.search, { scroll: false });
		}
	}, [searchParams, conversationIdFromUrl, refreshConversations, router]);

	// Filter users based on search query
	const filteredUsers = users.filter((user) => {
		if (!searchQuery.trim()) return true;

		const searchTermLower = searchQuery.toLowerCase();
		return (
			user.name.toLowerCase().includes(searchTermLower) ||
			(user.username &&
				user.username.toLowerCase().includes(searchTermLower)) ||
			(user.creator && user.creator.toLowerCase().includes(searchTermLower)) ||
			(user.lastMessage &&
				user.lastMessage.toLowerCase().includes(searchTermLower))
		);
	});

	// Set conversation from URL on mount
	useEffect(() => {
		if (
			conversationIdFromUrl &&
			conversationIdFromUrl !== selectedConversation
		) {
			// Check if this conversation exists in our current list
			const conversationExists = users.some(
				(user) => user.conversationId === conversationIdFromUrl
			);

			if (!conversationExists) {
				// This might be a new conversation, refresh the list first
				refreshConversations().then(() => {
					setSelectedConversation(conversationIdFromUrl);
				});
			} else {
				setSelectedConversation(conversationIdFromUrl);
			}
		}
	}, [
		conversationIdFromUrl,
		selectedConversation,
		setSelectedConversation,
		users,
		refreshConversations,
	]);

	// Fetch total unread count
	const fetchTotalUnreadCount = useCallback(async () => {
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
	}, [currentUser, setTotalUnreadCount, setUsers]);

	// Mark messages as read via socket
	const markMessagesAsReadSocket = (convId: string) => {
		if (!currentUser || !socket) return;

		socket.emit("mark-read", {
			conversationId: convId,
			userId: currentUser.uid,
		});

		// Update UI optimistically
		const currentConvUnreadCount =
			users.find((user) => user.conversationId === convId)?.unreadCount || 0;

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

	// Socket event listeners
	useEffect(() => {
		if (!selectedConversation || !socket || !currentUser) return;

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

				// If this message is from another user
				if (message.sender !== currentUser?.uid) {
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

			//  If this is a new conversation, refresh the conversations list
			if (message.isNewConversation) {
				refreshConversations();
			}

			// Scroll to bottom
			setTimeout(() => {
				if (scrollAreaRef.current) {
					const scrollArea = scrollAreaRef.current;
					scrollArea.scrollTop = scrollArea.scrollHeight;
				}
			}, 100);
		};

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
		};

		const handleUnreadCountsUpdate = (data: any) => {
			if (!data || !currentUser) return;

			if (typeof data.totalUnread === "number") {
				setTotalUnreadCount(data.totalUnread);
			}
		};

		const handleConversationCreated = (data: any) => {

			// Refresh conversations to include the new one
			refreshConversations();

			// If this is a conversation the current user is part of, refresh unread counts
			if (data.participants && data.participants.includes(currentUser?.uid)) {
				fetchTotalUnreadCount();
			}
		};

		socket.on("new-message", handleNewMessage);
		socket.on("conversation-updated", handleConversationUpdated);
		socket.on("unread-counts-update", handleUnreadCountsUpdate);

		return () => {
			leaveConversation(selectedConversation);
			socket.off("new-message", handleNewMessage);
			socket.off("conversation-updated", handleConversationUpdated);
			socket.off("unread-counts-update", handleUnreadCountsUpdate);
			socket.off("conversation-created", handleConversationCreated);
		};
	}, [
		selectedConversation,
		socket,
		currentUser,
		joinConversation,
		leaveConversation,
		setUsers,
		setConversations,
		setTotalUnreadCount,
		setMessages,
		refreshConversations,
		fetchTotalUnreadCount,
	]);

	// Fetch initial messages when conversation changes
	useEffect(() => {
		if (selectedConversation && currentUser) {
			fetchInitialMessages(selectedConversation);
		}
	}, [selectedConversation, currentUser, fetchInitialMessages]);

	useEffect(() => {
		fetchTotalUnreadCount();
	}, [currentUser]);

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		if (messages.length > 0) {
			setTimeout(() => {
				if (scrollAreaRef.current) {
					scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
				}
			}, 100);
		}
	}, [messages]);

	// Find selected user for header display
	const selectedUser =
		users.find((u) => u.conversationId === selectedConversation) || null;

	// Handle sending a new message
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

			socketSendMessage(selectedConversation, messageInput);
			setMessageInput("");
			setSelectedFiles([]);

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

	// Handle conversation selection with context method
	const handleConversationSelect = (conversationId: string) => {
		// Only update URL if it's different from current
		if (conversationIdFromUrl !== conversationId) {
			router.push(`/brand/dashboard/messages?conversation=${conversationId}`, {
				scroll: false,
			});
		}

		handleSelectConversation(conversationId);
		markMessagesAsReadSocket(conversationId);

		if (window.innerWidth < 768) {
			setShowSidebar(false);
		}
	};

	if (!currentUser) {
		return (
			<div className="flex items-center justify-center h-screen">
				Please log in to access messages
			</div>
		);
	}

	return (
		<div className="flex h-screen bg-white overflow-hidden">
			{/* Mobile overlay backdrop */}
			{showSidebar && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
					onClick={() => setShowSidebar(false)}
				/>
			)}

			{/* Left sidebar */}
			<div
				className={`
				${showSidebar ? "translate-x-0" : "-translate-x-full"} 
				md:translate-x-0 
				fixed md:relative 
				left-0 top-0 
				w-64 sm:w-72 md:w-80 lg:w-80 xl:w-96
				h-full 
				border-r 
				flex flex-col 
				bg-white 
				z-50 md:z-auto
				transition-transform duration-300 ease-in-out
			`}
			>
				{/* Mobile close button */}
				<div className="md:hidden flex justify-between items-center p-3 sm:p-4 border-b">
					<h2 className="text-base sm:text-lg font-semibold">Conversations</h2>
					<button
						onClick={() => setShowSidebar(false)}
						className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
					>
						<X className="h-4 w-4 sm:h-5 sm:w-5" />
					</button>
				</div>

				{/* Search bar */}
				<div className="p-3 sm:p-4">
					<div className="relative">
						<Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
						<Input
							placeholder="Search conversations..."
							className="pl-8 sm:pl-9 pr-3 py-2 sm:py-2.5 bg-gray-50 border-gray-200 rounded-lg text-sm sm:text-base focus:bg-white focus:border-orange-300 transition-colors"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				</div>

				{/* Sort options */}
				<div className="px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm text-gray-500 flex items-center mb-1 sm:mb-2">
					<span className="mr-2">Sort by:</span>
					<DropdownMenu>
						<DropdownMenuTrigger className="outline-none focus:outline-none">
							<span className="text-orange-600 font-medium flex items-center hover:text-orange-700 transition-colors">
								{sortOption}
								<ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
							</span>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="bg-white shadow-lg border rounded-lg">
							<DropdownMenuItem
								onClick={() => handleSortChange("Newest")}
								className="text-sm hover:bg-gray-50 cursor-pointer"
							>
								Newest
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => handleSortChange("Oldest")}
								className="text-sm hover:bg-gray-50 cursor-pointer"
							>
								Oldest
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* User list */}
				<ScrollArea className="flex-1 overflow-hidden">
					{loading ? (
						<div className="space-y-0.5 sm:space-y-1 px-2 sm:px-3">
							{[...Array(5)].map((_, i) => (
								<ConversationSkeleton key={i} />
							))}
						</div>
					) : filteredUsers.length === 0 ? (
						<div className="p-4 sm:p-6 text-center text-gray-500 text-sm sm:text-base">
							No conversations yet
						</div>
					) : (
						<div className="space-y-0.5 sm:space-y-1 px-2 sm:px-3">
							{filteredUsers.map((user) => (
								<div
									key={user.id}
									className={`
									flex items-center p-2.5 sm:p-3 md:p-4 
									cursor-pointer rounded-lg mx-1 sm:mx-2
									transition-all duration-200 ease-in-out
									hover:bg-gray-50 active:bg-gray-100
									${
										selectedConversation === user.conversationId
											? "bg-orange-50 border-l-4 border-orange-600 shadow-sm"
											: "border-l-4 border-transparent"
									}
								`}
									onClick={() => {
										if (user.conversationId) {
											handleConversationSelect(user.conversationId);
										}
									}}
								>
									<div className="relative flex-shrink-0">
										{imageLoadingStates[user.id] ? (
											<div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 bg-gray-200 animate-pulse rounded-full ring-2 ring-gray-100" />
										) : (
											<Avatar className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 ring-2 ring-gray-100">
												<Image
													src={
														user.creatorProfile?.avatarUrl ||
														user.avatar ||
														"/icons/default-avatar.svg"
													}
													alt="Profile"
													width={60}
													height={60}
													onLoadStart={() => handleImageLoadStart(user.id)}
													onLoad={() => handleImageLoad(user.id)}
													className="transition-opacity duration-300"
												/>
											</Avatar>
										)}
										{user.isActive && !imageLoadingStates[user.id] && (
											<div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
										)}
									</div>

									<div className="ml-2 sm:ml-3 flex-1 overflow-hidden min-w-0">
										<div className="flex justify-between items-start mb-0.5 sm:mb-1">
											<div className="flex gap-1.5 sm:gap-2 items-center min-w-0 flex-1">
												{imageLoadingStates[user.id] ? (
													<div className="h-4 sm:h-5 bg-gray-200 animate-pulse rounded w-24 sm:w-32" />
												) : (
													<p className="text-sm sm:text-base font-medium truncate text-gray-900">
														{user.creatorProfile?.displayName || user.name}
													</p>
												)}
												{(user.unreadCount ?? 0) > 0 && (
													<span className="bg-orange-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center flex-shrink-0 font-medium shadow-sm">
														{(user.unreadCount ?? 0) > 9
															? "9+"
															: (user.unreadCount ?? 0)}
													</span>
												)}
											</div>
											{imageLoadingStates[user.id] ? (
												<div className="h-3 bg-gray-200 animate-pulse rounded w-8 sm:w-10 flex-shrink-0 ml-2" />
											) : (
												<p className="text-xs text-gray-500 flex-shrink-0 ml-2">
													{user.time}
												</p>
											)}
										</div>
										{imageLoadingStates[user.id] ? (
											<div className="space-y-1">
												<div className="h-3 bg-gray-200 animate-pulse rounded w-full" />
												<div className="h-3 bg-gray-200 animate-pulse rounded w-3/4" />
											</div>
										) : (
											<p className="text-xs sm:text-sm text-gray-500 line-clamp-2 leading-relaxed">
												{user.lastMessage}
											</p>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</ScrollArea>
			</div>

			{/* Main chat area */}
			<div className="flex-1 flex flex-col h-full min-w-0 relative">
				{/* Chat header - fixed height */}
				{selectedUser ? (
					imageLoadingStates[selectedUser.id] ? (
						<HeaderSkeleton />
					) : (
						<div className="py-2 sm:py-3 px-3 sm:px-4 border-b flex items-center flex-shrink-0 bg-white shadow-sm">
							{/* Mobile menu button */}
							<button
								onClick={() => setShowSidebar(true)}
								className="md:hidden mr-2 sm:mr-3 p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
							>
								<Menu className="h-4 w-4 sm:h-5 sm:w-5" />
							</button>

							<div className="relative flex-shrink-0">
								<Avatar className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 ring-2 ring-gray-100">
									<Image
										src={
											selectedUser.creatorProfile?.avatarUrl ||
											selectedUser.avatar ||
											"/icons/default-avatar.svg"
										}
										alt="Profile"
										width={60}
										height={60}
										onLoadStart={() => handleImageLoadStart(selectedUser.id)}
										onLoad={() => handleImageLoad(selectedUser.id)}
										className="transition-opacity duration-300"
									/>
								</Avatar>
								{selectedUser.isActive && (
									<div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
								)}
							</div>

							<div className="ml-2 sm:ml-3 min-w-0 flex-1">
								<p className="text-sm sm:text-base md:text-lg font-medium truncate text-gray-900">
									{selectedUser.creatorProfile?.displayName ||
										selectedUser.name}
								</p>
								{selectedUser.username && (
									<p className="text-xs sm:text-sm text-orange-500 truncate">
										@{selectedUser.username}
									</p>
								)}
							</div>
						</div>
					)
				) : (
					<div className="py-2 sm:py-3 px-3 sm:px-4 border-b flex-shrink-0 bg-white shadow-sm flex items-center z-10">
						{/* Mobile menu button */}
						<button
							onClick={() => setShowSidebar(true)}
							className="md:hidden mr-2 sm:mr-3 p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors"
						>
							<Menu className="h-4 w-4 sm:h-5 sm:w-5" />
						</button>
						<p className="text-sm md:text-base font-medium text-gray-900">
							Select a conversation
						</p>
					</div>
				)}

				{/* Messages area - flexible height with proper padding for fixed input */}
				<div className="flex-1 overflow-hidden relative">
					<ScrollArea className="h-full">
						<div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 pb-24 sm:pb-28 md:pb-32 lg:pb-36">
							{/* Welcome message for empty conversations */}
							{messages.length === 0 && !loading && selectedUser && (
								<div className="flex justify-center items-center text-center bg-orange-50 text-orange-800 px-4 py-3 sm:py-4 rounded-lg text-sm sm:text-base border border-orange-200">
									{selectedUser.lastMessage &&
									selectedUser.lastMessage !== "Start a conversation"
										? "Loading conversation..."
										: `Start a conversation with ${selectedUser?.name}`}
								</div>
							)}

							

							{messages.map((message) => (
								<div key={message.id} className="space-y-1 sm:space-y-2">
									{message.date && message.sender === "system" && (
										<div className="flex justify-center my-4 sm:my-6">
											<div className="flex items-center justify-center">
												<div className="text-xs sm:text-sm text-gray-500 relative flex items-center">
													<span className="inline-block h-px w-8 sm:w-16 md:w-20 bg-gray-200 mr-2 sm:mr-3"></span>
													<span className="px-2 bg-white">{message.date}</span>
													<span className="inline-block h-px w-8 sm:w-16 md:w-20 bg-gray-200 ml-2 sm:ml-3"></span>
												</div>
											</div>
										</div>
									)}

									{message.sender !== "system" && (
										<div
											className={`flex ${
												message.sender === currentUser?.uid
													? "justify-end"
													: "justify-start"
											}`}
										>
											<div
												className={`
                      max-w-[90%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[65%] xl:max-w-[60%]
                      ${message.sender === currentUser?.uid ? "order-2" : "order-1"}
                    `}
											>
												<div className="flex items-start">
													{message.showAvatar &&
														message.sender !== currentUser?.uid && (
															<div className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 mt-1 mr-2 sm:mr-3 flex-shrink-0">
																{imageLoadingStates[
																	selectedUser?.id || "message"
																] ? (
																	<div className="h-full w-full bg-gray-200 animate-pulse rounded-full" />
																) : (
																	<Avatar className="h-full w-full">
																		<Image
																			src={
																				selectedUser?.creatorProfile
																					?.avatarUrl ||
																				selectedUser?.avatar ||
																				"/icons/default-avatar.svg"
																			}
																			alt="Profile"
																			width={60}
																			height={60}
																			onLoadStart={() =>
																				handleImageLoadStart(
																					selectedUser?.id || "message"
																				)
																			}
																			onLoad={() =>
																				handleImageLoad(
																					selectedUser?.id || "message"
																				)
																			}
																			className="transition-opacity duration-300"
																		/>
																	</Avatar>
																)}
															</div>
														)}
													<div className="space-y-1 min-w-0 flex-1">
														<div
															className={`
                            whitespace-pre-line px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base
                            leading-relaxed break-words
                            ${
															message.sender === currentUser?.uid
																? "bg-orange-100 text-orange-900 rounded-br-sm"
																: "bg-gray-50 border border-gray-200 text-gray-900 rounded-bl-sm"
														}
                          `}
														>
															{message.content}
														</div>
														<div
															className={`
                            flex text-xs text-gray-500 px-1
                            ${message.sender === currentUser?.uid ? "justify-end" : "justify-start"}
                          `}
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

				{/* Message input area - Fixed at bottom with proper responsive positioning */}
				<div className="absolute bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40">
					{/* File preview area */}
					{selectedFiles.length > 0 && (
						<div className="p-3 sm:p-4 border-b bg-gray-50">
							<div className="flex flex-wrap gap-2">
								{selectedFiles.map((file, index) => (
									<div
										key={index}
										className="relative bg-white border rounded-lg p-2 flex items-center space-x-2 shadow-sm"
									>
										<ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
										<span className="text-xs sm:text-sm text-gray-600 max-w-[60px] sm:max-w-[80px] md:max-w-[100px] truncate">
											{file.name}
										</span>
										<button
											onClick={() => removeFile(index)}
											className="text-gray-400 hover:text-red-500 flex-shrink-0 transition-colors"
										>
											<X className="h-3 w-3 sm:h-4 sm:w-4" />
										</button>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Input area */}
					<div className="p-3 sm:p-4 flex items-end space-x-2 sm:space-x-3">
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
							className="text-gray-400 hover:text-orange-500 p-1 sm:p-1.5 flex-shrink-0 transition-colors rounded-full hover:bg-gray-50"
						>
							<Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
						</button>

						{/* Message input */}
						<div className="flex-1 relative min-w-0">
							<Input
								placeholder="Type your message here..."
								className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 resize-none min-h-[20px] max-h-[80px] sm:max-h-[100px] text-sm sm:text-base border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
								value={messageInput}
								onChange={(e) => {
									setMessageInput(e.target.value);
									// Auto-resize textarea
									e.target.style.height = "auto";
									e.target.style.height =
										Math.min(e.target.scrollHeight, 140) + "px";
								}}
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
								className="text-gray-400 hover:text-orange-500 p-1 sm:p-1.5 transition-colors rounded-full hover:bg-gray-50"
							>
								<Smile className="h-4 w-4 sm:h-5 sm:w-5" />
							</button>

							{/* Emoji picker dropdown */}
							{showEmojiPicker && (
								<div className="absolute bottom-full right-0 mb-2 bg-white border rounded-lg shadow-xl p-3 w-48 sm:w-56 md:w-64 max-h-48 overflow-y-auto z-50">
									<div className="grid grid-cols-6 sm:grid-cols-7 md:grid-cols-8 gap-1">
										{commonEmojis.map((emoji, index) => (
											<button
												key={index}
												onClick={() => handleEmojiSelect(emoji)}
												className="p-1 sm:p-1.5 hover:bg-gray-100 rounded text-base sm:text-lg transition-colors"
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
							className={`
            rounded-full p-2 sm:p-2.5 transition-all duration-200 flex-shrink-0 shadow-sm
            ${
							!selectedUser ||
							sendingMessage ||
							(!messageInput.trim() && selectedFiles.length === 0)
								? "bg-gray-100 text-gray-400 cursor-not-allowed"
								: "bg-orange-600 text-white hover:bg-orange-700 active:bg-orange-800 hover:shadow-md"
						}
          `}
							onClick={handleSendMessage}
							disabled={
								sendingMessage ||
								!selectedUser ||
								(!messageInput.trim() && selectedFiles.length === 0)
							}
						>
							{sendingMessage ? (
								<LoadingSpinner size="sm" />
							) : (
								<Send className="h-4 w-4 sm:h-5 sm:w-5" />
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ChatPage;

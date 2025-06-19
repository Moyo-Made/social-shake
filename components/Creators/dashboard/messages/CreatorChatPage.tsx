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

const CreatorChatPage = () => {
	const { currentUser } = useAuth();
	const searchParams = useSearchParams();
	const router = useRouter();
	const conversationIdFromUrl = searchParams.get("conversation");
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const { setTotalUnreadCount } = useNotifications();

	// Use messaging context
	const {
		users,
		messages,
		selectedConversation,
		sortOption,
		searchQuery,
		loading,
		brandProfiles,
		setMessages,
		setSelectedConversation,
		setSearchQuery,
		handleSelectConversation,
		handleSortChange,
		fetchInitialMessages,
		refreshConversations,
		setUsers,
		setConversations,
	} = useMessaging();

	// Local state for component-specific functionality only
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const emojiPickerRef = useRef<HTMLDivElement>(null);
	const [showMobileSidebar, setShowMobileSidebar] = useState(false);
	const [messageInput, setMessageInput] = useState("");
	const [sendingMessage, setSendingMessage] = useState(false);
	const [userLoadingStates, setUserLoadingStates] = useState<{
		[key: string]: boolean;
	}>({});
	const [brandProfilesLoaded, setBrandProfilesLoaded] = useState(false);

	const {
		joinConversation,
		leaveConversation,
		sendMessage: socketSendMessage,
		socket,
	} = useSocket();

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

	// Set initial conversation from URL
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
	useEffect(() => {
		// If no users, consider profiles "loaded" since there's nothing to load
		if (users.length === 0) {
			setBrandProfilesLoaded(true);
			return;
		}

		// Check if we have brand profiles loaded for the users we're displaying
		if (Object.keys(brandProfiles).length > 0) {
			// Check if at least some users have their brand profiles loaded
			const hasProfiles = users.some(
				(user) => brandProfiles[user.id] || user.avatar
			);
			if (hasProfiles) {
				setBrandProfilesLoaded(true);
			}
		}
	}, [users, brandProfiles]);

	// Fetch total unread message count
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

			// NEW: If this is a new conversation, refresh the conversations list
			if (message.isNewConversation) {
				console.log("New conversation detected, refreshing conversations...");
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

		// NEW: Listen for conversation creation
		const handleConversationCreated = (data: any) => {
			console.log("New conversation created:", data);

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
		socket.on("conversation-created", handleConversationCreated);

		// Clean up when unmounting
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

	// Initial fetch of messages when conversation changes
	useEffect(() => {
		if (selectedConversation) {
			fetchInitialMessages(selectedConversation);
		}
	}, [selectedConversation, fetchInitialMessages]);

	// Fetch total unread count on component mount
	useEffect(() => {
		fetchTotalUnreadCount();
	}, [currentUser]);

	// Find selected user for header display
	const selectedUser =
		users.find((u) => u.conversationId === selectedConversation) || null;

	// Handle sending a new message using the socket
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

	// Handle conversation selection - use context method
	const handleConversationSelect = (conversationId: string) => {
		// Use the context method
		handleSelectConversation(conversationId);

		// Mark messages as read using socket
		markMessagesAsReadSocket(conversationId);

		// Update URL without full page reload
		router.push(`/creator/dashboard/messages?conversation=${conversationId}`, {
			scroll: false,
		});

		// Close mobile sidebar
		setShowMobileSidebar(false);
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
		<div className="flex h-screen bg-white w-full">
			{/* Mobile menu overlay */}
			<div
				className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden ${showMobileSidebar ? "block" : "hidden"}`}
				onClick={() => setShowMobileSidebar(false)}
			></div>

			{/* Left sidebar */}
			<div
				className={`w-full sm:w-80 lg:w-72 border-r flex flex-col fixed lg:relative inset-y-0 left-0 z-50 bg-white transform transition-transform duration-300 ease-in-out ${showMobileSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
			>
				{/* Mobile header */}
				<div className="flex items-center justify-between p-4 border-b lg:hidden">
					<h2 className="text-lg font-semibold">Conversations</h2>
					<button
						onClick={() => setShowMobileSidebar(false)}
						className="p-2 hover:bg-gray-100 rounded-lg"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Search and filters */}
				<div className="p-3 sm:p-4">
					<div className="relative mb-3">
						<Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
						<Input
							placeholder="Search conversations..."
							className="pl-8 bg-gray-100 border-0 text-sm"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				</div>

				{/* Sort options */}
				<div className="px-3 sm:px-4 py-2 text-sm text-gray-500 flex items-center mb-2">
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
					{loading || !brandProfilesLoaded ? (
						<div className="space-y-1">
							{[1, 2, 3, 4, 5].map((i) => (
								<div key={i} className="flex items-center p-3 sm:p-4">
									{/* Avatar skeleton */}
									<div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
									<div className="ml-3 flex-1 min-w-0">
										<div className="flex justify-between items-center mb-2">
											{/* Name skeleton */}
											<div className="h-4 bg-gray-200 rounded animate-pulse w-24 sm:w-32"></div>
											{/* Time skeleton */}
											<div className="h-3 bg-gray-200 rounded animate-pulse w-12"></div>
										</div>
										{/* Message skeleton */}
										<div className="h-3 bg-gray-200 rounded animate-pulse w-full max-w-48"></div>
									</div>
								</div>
							))}
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
										handleConversationSelect(user.conversationId);
									}
								}}
							>
								<div className="relative flex-shrink-0">
									<Avatar className="w-10 h-10 sm:w-12 sm:h-12">
										{!user.name || userLoadingStates[user.id] ? (
											<div className="w-full h-full bg-gray-200 rounded-full animate-pulse"></div>
										) : (
											<Image
												src={
													brandProfiles[user.id]?.logoUrl ||
													(user.avatar && user.avatar !== ""
														? user.avatar
														: "/icons/default-avatar.svg")
												}
												alt=""
												width={48}
												height={48}
												className="rounded-full"
												onLoadStart={() =>
													setUserLoadingStates((prev) => ({
														...prev,
														[user.id]: true,
													}))
												}
												onLoad={() =>
													setUserLoadingStates((prev) => ({
														...prev,
														[user.id]: false,
													}))
												}
												onError={() =>
													setUserLoadingStates((prev) => ({
														...prev,
														[user.id]: false,
													}))
												}
											/>
										)}
									</Avatar>
									{user.isActive && !userLoadingStates[user.id] && (
										<div className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white"></div>
									)}
								</div>
								<div className="ml-3 flex-1 min-w-0">
									<div className="flex justify-between items-center">
										<div className="flex gap-2 items-center">
											{!user.name ? (
												<div className="h-4 bg-gray-200 rounded animate-pulse w-24 sm:w-32"></div>
											) : (
												<p className="text-sm sm:text-base font-medium truncate">
													{user.name}
												</p>
											)}
											{(user.unreadCount ?? 0) > 0 && (
												<span className="bg-orange-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center flex-shrink-0">
													{(user.unreadCount ?? 0) > 9
														? "9+"
														: (user.unreadCount ?? 0)}
												</span>
											)}
										</div>
										<p className="text-xs text-gray-500 flex-shrink-0">
											{user.time}
										</p>
									</div>
									<p className="text-xs sm:text-sm text-gray-500 line-clamp-1 mt-0.5">
										{user.lastMessage}
									</p>
								</div>
							</div>
						))
					)}
				</ScrollArea>
			</div>

			{/* Main chat area */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Chat header */}
				{selectedUser ? (
					<div className="py-3 px-3 sm:px-4 border-b flex justify-between items-center bg-white relative">
						<div className="flex items-center min-w-0">
							{/* Mobile menu button */}
							<button
								onClick={() => setShowMobileSidebar(true)}
								className="mr-3 p-1 hover:bg-gray-100 rounded-lg lg:hidden flex-shrink-0"
							>
								<Menu className="h-5 w-5" />
							</button>

							{loading || !brandProfilesLoaded ? (
								<>
									<div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
									<div className="ml-3 min-w-0">
										<div className="h-4 bg-gray-200 rounded animate-pulse w-24 sm:w-32 mb-1"></div>
										<div className="h-3 bg-gray-200 rounded animate-pulse w-16 sm:w-20"></div>
									</div>
								</>
							) : (
								<>
									<Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
										{!selectedUser?.name ||
										userLoadingStates[selectedUser?.id] ? (
											<div className="w-full h-full bg-gray-200 rounded-full animate-pulse"></div>
										) : (
											<Image
												src={
													(selectedUser &&
														brandProfiles[selectedUser.id]?.logoUrl) ||
													(selectedUser?.avatar &&
													selectedUser.avatar !== "/icons/default-avatar.svg"
														? selectedUser.avatar
														: "/icons/default-avatar.svg")
												}
												alt=""
												width={40}
												height={40}
												className="rounded-full"
												onLoadStart={() =>
													setUserLoadingStates((prev) => ({
														...prev,
														[selectedUser.id]: true,
													}))
												}
												onLoad={() =>
													setUserLoadingStates((prev) => ({
														...prev,
														[selectedUser.id]: false,
													}))
												}
												onError={() =>
													setUserLoadingStates((prev) => ({
														...prev,
														[selectedUser.id]: false,
													}))
												}
											/>
										)}
									</Avatar>

									<div className="ml-3 min-w-0">
										{!selectedUser?.name ? (
											<div className="h-4 bg-gray-200 rounded animate-pulse w-24 sm:w-32 mb-1"></div>
										) : (
											<p className="text-sm sm:text-base font-medium truncate">
												{selectedUser.name}
											</p>
										)}
										{!selectedUser?.username ? (
											<div className="h-3 bg-gray-200 rounded animate-pulse w-16 sm:w-20"></div>
										) : (
											selectedUser.username && (
												<p className="text-xs text-orange-600 truncate">
													@{selectedUser.username}
												</p>
											)
										)}
									</div>
								</>
							)}
						</div>
					</div>
				) : (
					<div className="py-3 px-3 sm:px-4 border-b bg-white relative ">
						<div className="flex items-center">
							{/* Mobile menu button */}
							<button
								onClick={() => setShowMobileSidebar(true)}
								className="mr-3 p-1 hover:bg-gray-100 rounded-lg lg:hidden"
							>
								<Menu className="h-5 w-5" />
							</button>
							<p className="text-sm sm:text-base font-medium">
								Select a conversation
							</p>
						</div>
					</div>
				)}

				{/* Messages area */}
				<div className="flex-1 overflow-auto relative" ref={scrollAreaRef}>
					<div className="p-3 sm:p-4 space-y-4 sm:space-y-6 pb-24">
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
							<div className="space-y-4">
								{[1, 2, 3].map((i) => (
									<div
										key={i}
										className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
									>
										<div
											className={`max-w-xs sm:max-w-md lg:max-w-2xl ${i % 2 === 0 ? "order-2" : "order-1"}`}
										>
											<div className="flex items-start">
												{i % 2 !== 0 && (
													<div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0 mt-1 mr-3"></div>
												)}
												<div className="space-y-1">
													<div
														className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg ${i % 2 === 0 ? "bg-gray-200" : "bg-gray-200"} animate-pulse`}
													>
														<div className="h-4 bg-gray-300 rounded w-32 sm:w-48"></div>
													</div>
													<div
														className={`h-3 bg-gray-200 rounded animate-pulse w-12 ${i % 2 === 0 ? "ml-auto" : ""}`}
													></div>
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						)}

						{messages.map((message) => (
							<div key={message.id} className="space-y-1">
								{message.date && message.sender === "system" && (
									<div className="flex justify-center my-4">
										<div className="flex items-center justify-center my-4">
											<div className="text-xs text-gray-500 relative flex items-center">
												<span className="inline-block h-px w-16 sm:w-32 lg:w-80 bg-gray-200 mr-2"></span>
												{message.date}
												<span className="inline-block h-px w-16 sm:w-32 lg:w-80 bg-gray-200 ml-2"></span>
											</div>
										</div>
									</div>
								)}

								{message.sender !== "system" && (
									<div
										className={`flex ${message.sender === currentUser?.uid ? "justify-end" : "justify-start"}`}
									>
										<div
											className={`max-w-xs sm:max-w-md lg:max-w-2xl xl:max-w-3xl ${message.sender === currentUser?.uid ? "order-2" : "order-1"}`}
										>
											<div className="flex items-start">
												{message.showAvatar &&
													message.sender !== currentUser?.uid && (
														<Avatar className="h-6 w-6 sm:h-8 sm:w-8 mt-1 mr-2 sm:mr-3 flex-shrink-0">
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
																width={32}
																height={32}
																className="rounded-full"
															/>
														</Avatar>
													)}
												<div className="space-y-1">
													<div
														className={`whitespace-pre-line px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm ${
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

				{/* Message input area - Fixed at bottom */}
				<div className="border-t bg-white flex-shrink-0 sticky bottom-0 z-30">
					{/* File preview area */}
					{selectedFiles.length > 0 && (
						<div className="p-2 sm:p-3 border-b bg-gray-50">
							<div className="flex flex-wrap gap-2">
								{selectedFiles.map((file, index) => (
									<div
										key={index}
										className="relative bg-white border rounded-lg p-2 flex items-center space-x-2"
									>
										<ImageIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
										<span className="text-xs sm:text-sm text-gray-600 max-w-[60px] sm:max-w-[80px] lg:max-w-[100px] truncate">
											{file.name}
										</span>
										<button
											onClick={() => removeFile(index)}
											className="text-gray-400 hover:text-red-500 flex-shrink-0"
										>
											<X className="h-3 w-3 sm:h-4 sm:w-4" />
										</button>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Input area */}
					<div className="p-2 sm:p-3 lg:p-4 flex items-end space-x-2 relative">
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
							aria-label="Attach file"
						>
							<Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
						</button>

						{/* Message input */}
						<div className="flex-1 relative min-w-0">
							<Input
								placeholder="Type your message here..."
								className="pr-10 resize-none min-h-[36px] sm:min-h-[40px] max-h-[120px] text-sm"
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
								aria-label="Add emoji"
							>
								<Smile className="h-4 w-4 sm:h-5 sm:w-5" />
							</button>

							{/* Emoji picker dropdown */}
							{showEmojiPicker && (
								<div className="absolute bottom-full right-0 mb-2 bg-white border rounded-lg shadow-lg p-2 sm:p-3 w-40 sm:w-48 lg:w-64 max-h-40 sm:max-h-48 overflow-y-auto z-50">
									<div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
										{commonEmojis.map((emoji, index) => (
											<button
												key={index}
												onClick={() => handleEmojiSelect(emoji)}
												className="p-1 hover:bg-gray-100 rounded text-sm sm:text-base lg:text-lg transition-colors"
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
							} rounded-full p-1.5 sm:p-2 transition-colors flex-shrink-0`}
							onClick={handleSendMessage}
							disabled={
								sendingMessage ||
								!selectedUser ||
								(!messageInput.trim() && selectedFiles.length === 0)
							}
							aria-label="Send message"
						>
							{sendingMessage ? (
								<div className="h-4 w-4 sm:h-5 sm:w-5 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
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

export default CreatorChatPage;

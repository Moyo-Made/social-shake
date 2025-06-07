/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useConversations } from '@/hooks/useMessaging';
import { MessagingContextType, Conversation as ImportedConversation } from '@/types/messaging';
import { BrandProfile } from '@/types/user';

export interface User {
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
	creator?: string;
	creatorProfile?: {
		avatarUrl: string | null;
		displayName: string | null;
	};
}

export interface Message {
	id: string;
	sender: string;
	content: string;
	timestamp: any;
	date?: string;
	showAvatar?: boolean;
	isPinned?: boolean;
}

// Use the imported Conversation type instead of defining a local one
export interface Conversation extends ImportedConversation {
  creatorProfile: any;
  participantsInfo: Record<string, { name: string; avatar: string; username?: string }>;
  unreadCounts: Record<string, number>;
  updatedAt: Date | string;
}

// Updated context type
interface ExtendedMessagingContextType extends MessagingContextType {
	users: User[];
	messages: Message[];
	selectedConversation: string | null;
	brandProfiles: Record<string, BrandProfile>;
	imageLoadingStates: Record<string, boolean>;
	sortOption: string;
	searchQuery: string;

	setUsers: React.Dispatch<React.SetStateAction<User[]>>;
	setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
	setBrandProfiles: React.Dispatch<React.SetStateAction<Record<string, BrandProfile>>>;
	setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
	setSelectedConversation: React.Dispatch<React.SetStateAction<string | null>>;
	setImageLoadingStates: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
	setSortOption: React.Dispatch<React.SetStateAction<string>>;
	setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
	
	// Methods
	handleSelectConversation: (conversationId: string) => void;
	handleSortChange: (option: "Newest" | "Oldest") => void;
	handleImageLoad: (userId: string) => void;
	handleImageLoadStart: (userId: string) => void;
	fetchInitialMessages: (conversationId: string) => Promise<void>;
	refreshConversations: () => Promise<void>;
}

// Create context with default values
const MessagingContext = createContext<ExtendedMessagingContextType>({
	conversations: [],
	users: [],
	messages: [],
	selectedConversation: null,
	brandProfiles: {},
	imageLoadingStates: {},
	sortOption: "Newest",
	searchQuery: "",
	unreadCount: 0,
	loading: false,
	error: null,
	startConversation: async () => null,
	getConversation: async () => null,
	
	setUsers: () => {},
	setConversations: () => {},
	setBrandProfiles: () => {},
	setMessages: () => {},
	setSelectedConversation: () => {},
	setImageLoadingStates: () => {},
	setSortOption: () => {},
	setSearchQuery: () => {},
	handleSelectConversation: () => {},
	handleSortChange: () => {},
	handleImageLoad: () => {},
	handleImageLoadStart: () => {},
	fetchInitialMessages: async () => {},
	refreshConversations: async () => {},
});

export const MessagingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { currentUser } = useAuth();
	const userId = currentUser?.uid;

	// State
	const [brandProfiles, setBrandProfiles] = useState<Record<string, BrandProfile>>({});
	const [users, setUsers] = useState<User[]>([]);
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [messages, setMessages] = useState<Message[]>([]);
	const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({});
	const [sortOption, setSortOption] = useState("Newest");
	const [searchQuery, setSearchQuery] = useState("");
	
	const {
		unreadCount,
		error,
		startConversation,
		getConversation
	} = useConversations(userId);

	// Memoized methods
	const handleImageLoad = useCallback((userId: string) => {
		setImageLoadingStates((prev) => ({ ...prev, [userId]: false }));
	}, []);

	const handleImageLoadStart = useCallback((userId: string) => {
		setImageLoadingStates((prev) => ({ ...prev, [userId]: true }));
	}, []);

	const handleSortChange = useCallback((option: "Newest" | "Oldest") => {
		setSortOption(option);

		setUsers((prevUsers) => {
			const sortedUsers = [...prevUsers];
			sortedUsers.sort((a, b) => {
				const timeA = a.timestamp || 0;
				const timeB = b.timestamp || 0;
				return option === "Newest" ? timeB - timeA : timeA - timeB;
			});
			return sortedUsers;
		});
	}, []);

	const handleSelectConversation = useCallback((conversationId: string) => {
		if (selectedConversation !== conversationId) {
			setMessages([]); // Clear messages when switching conversations
		}
		setSelectedConversation(conversationId);
	}, [selectedConversation]);

	const fetchInitialMessages = useCallback(async (conversationId: string) => {
		if (!conversationId || !currentUser) return;

		try {
			const response = await fetch(
				`/api/messages?conversationId=${conversationId}`
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
		} catch (error) {
			console.error("Error fetching messages:", error);
		}
	}, [currentUser]);

	// const fetchAllBrandProfiles = useCallback(async (userIds: string[]) => {
	// 	try {
	// 		const promises = userIds.map(async (userId) => {
	// 			const response = await fetch(
	// 				`/api/admin/brand-approval?userId=${userId}`
	// 			);
	// 			if (response.ok) {
	// 				const data = await response.json();
	// 				return { userId, data };
	// 			}
	// 			return { userId, data: null };
	// 		});

	// 		const results = await Promise.all(promises);
	// 		const newBrandProfiles: Record<string, BrandProfile> = {};
			
	// 		results.forEach(({ userId, data }) => {
	// 			if (data) {
	// 				newBrandProfiles[userId] = data;
	// 			}
	// 		});

	// 		if (Object.keys(newBrandProfiles).length > 0) {
	// 			setBrandProfiles((prev) => ({ ...prev, ...newBrandProfiles }));
	// 		}
	// 	} catch (error) {
	// 		console.error("Error fetching brand profiles:", error);
	// 	}
	// }, []);

	const fetchBrandProfile = useCallback(async (userId: string) => {
		try {
			const response = await fetch(
				`/api/admin/brand-approval?userId=${userId}`
			);
			if (response.ok) {
				const data = await response.json();
				return data;
			}
		} catch (error) {
			console.error(
				`Error fetching brand profile for userId ${userId}:`,
				error
			);
		}
		return null;
	}, []);

	const refreshConversations = useCallback(async () => {
		if (!currentUser) return;

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
				const otherParticipantId = conv.participants.find(
					(p: string) => p !== currentUser.uid
				);

				const participantInfo = otherParticipantId
					? conv.participantsInfo?.[otherParticipantId]
					: undefined;

				// Check if avatar is actually a valid URL
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

				const unreadCount = conv.unreadCounts?.[currentUser.uid] || 0;
				const timestamp = conv.updatedAt
					? new Date(conv.updatedAt).getTime()
					: 0;

				// Handle lastMessage properly
				const lastMessageText = typeof conv.lastMessage === 'string' 
					? conv.lastMessage 
					: conv.lastMessage?.content || "Start a conversation";

				return {
					id: otherParticipantId || "",
					name: otherParticipantId
						? brandProfiles[otherParticipantId]?.brandName ||
							participantInfo?.name ||
							"Unknown User"
						: "Unknown User",
					avatar: isValidAvatar ? avatarUrl : "/icons/default-avatar.svg",
					username: participantInfo?.username || "",
					lastMessage: lastMessageText,
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
					creator: conv.participants.find(p => p !== currentUser.uid) || "",
					creatorProfile: conv.creatorProfile,
				};
			});

			setUsers(processedUsers.filter((user: User) => user.id !== undefined));


			setLoading(false);
		} catch (error) {
			console.error("Error fetching conversations:", error);
			setLoading(false);
		}
	}, [currentUser, brandProfiles, fetchBrandProfile]);

	// Initial fetch on mount
	useEffect(() => {
		if (currentUser) {
			refreshConversations();
		}
	}, [currentUser]); // Only depend on currentUser, not refreshConversations to avoid infinite loops

	// Update users when brand profiles are loaded
	useEffect(() => {
		if (Object.keys(brandProfiles).length > 0) {
			setUsers((prevUsers) =>
				prevUsers.map((user) => {
					const brandName = brandProfiles[user.id]?.brandName;
					return brandName && brandName !== user.name
						? { ...user, name: brandName }
						: user;
				})
			);
		}
	}, [brandProfiles]);

	// Value to be provided to consumers
	const value: ExtendedMessagingContextType = {
		conversations,
		users,
		messages,
		selectedConversation,
		brandProfiles,
		imageLoadingStates,
		sortOption,
		searchQuery,
		unreadCount,
		loading,
		error,
		startConversation,
		getConversation,
		setUsers,
		setConversations,
		setBrandProfiles,
		setMessages,
		setSelectedConversation,
		setImageLoadingStates,
		setSortOption,
		setSearchQuery,
		handleSelectConversation,
		handleSortChange,
		handleImageLoad,
		handleImageLoadStart,
		fetchInitialMessages,
		refreshConversations,
	};

	return (
		<MessagingContext.Provider value={value}>
			{children}
		</MessagingContext.Provider>
	);
};

// Hook for using the messaging context
export const useMessaging = () => {
	const context = useContext(MessagingContext);
	if (context === undefined) {
		throw new Error('useMessaging must be used within a MessagingProvider');
	}
	return context;
};
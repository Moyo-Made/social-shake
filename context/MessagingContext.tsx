/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
	
	// TanStack Query states
	conversationsQuery: {
		data: Conversation[] | undefined;
		isLoading: boolean;
		error: Error | null;
		refetch: () => void;
	};
	messagesQuery: {
		data: Message[] | undefined;
		isLoading: boolean;
		error: Error | null;
		refetch: () => void;
	};
	brandProfilesQuery: {
		data: Record<string, BrandProfile> | undefined;
		isLoading: boolean;
		error: Error | null;
		refetch: () => void;
	};
	
	// Actions
	fetchAllBrandProfiles: (userIds: string[]) => Promise<void>;
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

// Query Keys
export const messagingKeys = {
	all: ['messaging'] as const,
	conversations: (userId: string) => [...messagingKeys.all, 'conversations', userId] as const,
	messages: (conversationId: string) => [...messagingKeys.all, 'messages', conversationId] as const,
	brandProfiles: (userIds: string[]) => [...messagingKeys.all, 'brandProfiles', userIds.sort()] as const,
	brandProfile: (userId: string) => [...messagingKeys.all, 'brandProfile', userId] as const,
};

// API Functions
const fetchConversations = async (userId: string): Promise<Conversation[]> => {
	const response = await fetch(`/api/conversations?userId=${userId}`);
	if (!response.ok) {
		throw new Error('Failed to fetch conversations');
	}
	const data = await response.json();
	return data.conversations;
};

const fetchMessages = async (conversationId: string): Promise<any[]> => {
	const response = await fetch(`/api/messages?conversationId=${conversationId}`);
	if (!response.ok) {
		throw new Error('Failed to fetch messages');
	}
	const data = await response.json();
	return data.messages;
};

const fetchBrandProfile = async (userId: string): Promise<BrandProfile | null> => {
	try {
		const response = await fetch(`/api/admin/brand-approval?userId=${userId}`);
		if (response.ok) {
			return await response.json();
		}
	} catch (error) {
		console.error(`Error fetching brand profile for userId ${userId}:`, error);
	}
	return null;
};

const fetchBrandProfiles = async (userIds: string[]): Promise<Record<string, BrandProfile>> => {
	const promises = userIds.map(async (userId) => {
		const data = await fetchBrandProfile(userId);
		return { userId, data };
	});

	const results = await Promise.all(promises);
	const brandProfiles: Record<string, BrandProfile> = {};
	
	results.forEach(({ userId, data }) => {
		if (data) {
			brandProfiles[userId] = data;
		}
	});

	return brandProfiles;
};

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
	conversationsQuery: {
		data: undefined,
		isLoading: false,
		error: null,
		refetch: () => {},
	},
	messagesQuery: {
		data: undefined,
		isLoading: false,
		error: null,
		refetch: () => {},
	},
	brandProfilesQuery: {
		data: undefined,
		isLoading: false,
		error: null,
		refetch: () => {},
	},
	startConversation: async () => null,
	getConversation: async () => null,
	fetchAllBrandProfiles: async () => {},
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
	const queryClient = useQueryClient();

	// State
	const [brandProfiles, setBrandProfiles] = useState<Record<string, BrandProfile>>({});
	const [users, setUsers] = useState<User[]>([]);
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [messages, setMessages] = useState<Message[]>([]);
	const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
	const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({});
	const [sortOption, setSortOption] = useState("Newest");
	const [searchQuery, setSearchQuery] = useState("");
	
	const {
		unreadCount,
		error: hookError,
		startConversation,
		getConversation
	} = useConversations(userId);

	// TanStack Query for conversations
	const conversationsQuery = useQuery({
		queryKey: messagingKeys.conversations(userId || ''),
		queryFn: () => fetchConversations(userId!),
		enabled: !!userId,
		staleTime: 30 * 1000, // 30 seconds
		refetchInterval: 60 * 1000, // Refetch every minute for real-time updates
	});

	// TanStack Query for messages
	const messagesQuery = useQuery({
		queryKey: messagingKeys.messages(selectedConversation || ''),
		queryFn: () => fetchMessages(selectedConversation!),
		enabled: !!selectedConversation,
		staleTime: 10 * 1000, // 10 seconds
	});

	// Get user IDs from conversations for brand profiles
	const userIds = conversationsQuery.data?.map(conv => 
		conv.participants.find(p => p !== userId) || ''
	).filter(Boolean) || [];

	// TanStack Query for brand profiles
	const brandProfilesQuery = useQuery({
		queryKey: messagingKeys.brandProfiles(userIds),
		queryFn: () => fetchBrandProfiles(userIds),
		enabled: userIds.length > 0,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	// Update local state when queries succeed
	useEffect(() => {
		if (conversationsQuery.data) {
			setConversations(conversationsQuery.data);
		}
	}, [conversationsQuery.data]);

	useEffect(() => {
		if (brandProfilesQuery.data) {
			setBrandProfiles(prev => ({ ...prev, ...brandProfilesQuery.data }));
		}
	}, [brandProfilesQuery.data]);

	// Process messages when messagesQuery data changes
	useEffect(() => {
		if (messagesQuery.data && currentUser) {
			const processedMessages: Message[] = [];
			let currentDate = "";

			messagesQuery.data.forEach((msg: any, index: number) => {
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
		}
	}, [messagesQuery.data, currentUser]);

	// Process conversations into user format for sidebar
	useEffect(() => {
		if (conversationsQuery.data && currentUser) {
			const processedUsers = conversationsQuery.data.map((conv: Conversation) => {
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
		}
	}, [conversationsQuery.data, currentUser, brandProfiles]);

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

	// Legacy methods for backward compatibility
	const fetchInitialMessages = useCallback(async (conversationId: string) => {
		// This is now handled by the messagesQuery, but keeping for compatibility
		if (conversationId !== selectedConversation) {
			setSelectedConversation(conversationId);
		}
		// The query will automatically fetch when selectedConversation changes
	}, [selectedConversation]);

	const fetchAllBrandProfiles = useCallback(async (userIds: string[]) => {
		// Invalidate and refetch brand profiles query
		queryClient.invalidateQueries({
			queryKey: messagingKeys.brandProfiles(userIds)
		});
	}, [queryClient]);

	const refreshConversations = useCallback(async () => {
		// Refetch conversations
		await conversationsQuery.refetch();
	}, [conversationsQuery]);

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
		loading: conversationsQuery.isLoading || messagesQuery.isLoading || brandProfilesQuery.isLoading,
		error: hookError || conversationsQuery.error?.message || messagesQuery.error?.message || brandProfilesQuery.error?.message || null,
		conversationsQuery: {
			data: conversationsQuery.data,
			isLoading: conversationsQuery.isLoading,
			error: conversationsQuery.error,
			refetch: conversationsQuery.refetch,
		},
		messagesQuery: {
			data: messagesQuery.data,
			isLoading: messagesQuery.isLoading,
			error: messagesQuery.error,
			refetch: messagesQuery.refetch,
		},
		brandProfilesQuery: {
			data: brandProfilesQuery.data,
			isLoading: brandProfilesQuery.isLoading,
			error: brandProfilesQuery.error,
			refetch: brandProfilesQuery.refetch,
		},
		startConversation,
		getConversation,
		fetchAllBrandProfiles,
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
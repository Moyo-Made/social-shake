"use client";

import { useState } from "react";
import { Search, Send, Smile, Paperclip } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import Image from "next/image";

type User = {
	id: string;
	name: string;
	avatar: string;
	lastMessage?: string;
	time?: string;
	isActive?: boolean;
};

type Message = {
	id: string;
	sender: "system" | User;
	content: string;
	timestamp: string;
	date?: string;
	showAvatar?: boolean;
	isPinned?: boolean;
};

const ChatPage = () => {
	// Sidebar users data
	const users: User[] = [
		{
			id: "1",
			name: "XYZ Shoes Contest",
			avatar: "/icons/xyz.svg",
			lastMessage: "How are you doing?",
			time: "10:45",
		},
		{
			id: "2",
			name: "John Doe",
			avatar: "/icons/john.svg",
			lastMessage: "How are you doing?",
			time: "10:45",
		},
		{
			id: "3",
			name: "Travis Barker",
			avatar: "/icons/travis.svg",
			lastMessage: "Hey!",
			time: "10:45",
		},
		{
			id: "4",
			name: "Kate Rose",
			avatar: "/icons/kate.svg",
			lastMessage: "Just today send the Spark C...",
			time: "10:45",
		},
		{
			id: "5",
			name: "Robert Parker",
			avatar: "/icons/robert.svg",
			lastMessage: "Here it is - TIKTOK SPARK!...",
			time: "10:45",
			isActive: true,
		},
	];

	// Messages data
	const messages: Message[] = [
		{
			id: "1",
			sender: "system",
			content:
				"🚨 Welcome to the XYZ Shoes Contest! Stay tuned for updates, reminders, and leaderboard announcements.",
			timestamp: "11th January 2025",
			isPinned: true,
		},
		{
			id: "2",
			sender: {
				id: "admin",
				name: "XYZ Shoes Contest",
				avatar: "/avatars/xyz.png",
			},
			content:
				"Hi everyone! Welcome to the XYZ Shoes Contest!\n\nWe're excited to see your amazing TikTok creations. Make sure to review the contest guidelines and requirements in your dashboard.\n\nStay tuned for leaderboard updates, tips, and reminders. Let's make this fun and competitive. Good luck!",
			timestamp: "2:20pm",
			date: "Yesterday",
			showAvatar: true,
		},
		{
			id: "3",
			sender: {
				id: "admin",
				name: "XYZ Shoes Contest",
				avatar: "/avatars/xyz.png",
			},
			content:
				"Hey creators! Just a friendly reminder to start posting your TikTok content for the XYZ Shoes Contest!\n\nThe leaderboard is live and will update every hour with metrics like views, likes, and shares.\n\nMake your posts stand out, tag us, and let's see those numbers climb!",
			timestamp: "2:20pm",
			date: "Today",
			showAvatar: true,
		},
		{
			id: "4",
			sender: {
				id: "admin",
				name: "XYZ Shoes Contest",
				avatar: "/avatars/xyz.png",
			},
			content:
				"The leaderboard for XYZ Shoes Contest has been updated!\n\nTop 3 Creators Right Now:\n\n1. @Celina42Df\n2. @ClumsieeWeb\n3. @Hispanic45ge\n\nKeep those TikTok posts coming to climb the ranks. Remember, creativity and engagement counts!",
			timestamp: "2:20pm",
			showAvatar: true,
		},
	];

	const [selectedUser, setSelectedUser] = useState<User>(users[0]);
	const [messageInput, setMessageInput] = useState("");

	return (
		<div className="flex h-screen bg-white w-full">
			{/* Left sidebar */}
			<div className="w-72 border-r flex flex-col">
				{/* Search bar */}
				<div className="p-4">
					<div className="relative">
						<Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
						<Input
							placeholder="Search..."
							className="pl-8 bg-gray-100 border-0"
						/>
					</div>
				</div>

				{/* Sort options */}
				<div className="px-4 py-2 text-sm text-gray-500 flex items-center">
					<span>Sort by:</span>
					<span className="ml-1 text-orange-500 font-medium flex items-center">
						Newest
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="ml-1"
						>
							<path d="m6 9 6 6 6-6" />
						</svg>
					</span>
				</div>

				{/* User list */}
				<ScrollArea className="flex-1">
					{users.map((user) => (
						<div
							key={user.id}
							className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 ${
								selectedUser.id === user.id ? "bg-gray-50" : ""
							}`}
							onClick={() => setSelectedUser(user)}
						>
							<div className="relative">
								<Avatar className="">
									<Image
										src={user.avatar}
										alt="Profile"
										width={60}
										height={60}
									/>
								</Avatar>
								{user.isActive && (
									<div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-orange-500 border-2 border-white"></div>
								)}
							</div>
							<div className="ml-3 flex-1 overflow-hidden">
								<div className="flex justify-between items-center">
									<p className="text-base font-medium truncate">{user.name}</p>
									<p className="text-sm text-gray-500">{user.time}</p>
								</div>
								<p className="text-sm text-gray-500 truncate">
									{user.lastMessage}
								</p>
							</div>
						</div>
					))}
				</ScrollArea>
			</div>

			{/* Main chat area */}
			<div className="flex-1 flex flex-col">
				{/* Chat header */}
				<div className="py-3 px-4 border-b flex items-center">
					<Avatar className="">
						<Image
							src={selectedUser.avatar}
							alt="Profile"
							width={60}
							height={60}
						/>
					</Avatar>
					<div className="ml-3">
						<p className="text-base font-medium">{selectedUser.name}</p>
						<p className="text-sm text-orange-500">View Contest</p>
					</div>
				</div>

				{/* Messages area */}
				<ScrollArea className="flex-1 p-4">
					<div className="space-y-6">
						{messages.map((message) => (
							<div key={message.id} className="space-y-1">
								{message.date && (
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

								<div className="flex items-start">
									{message.showAvatar && typeof message.sender !== "string" && (
										<Avatar className="h-8 w-8 mt-1">
											<Image src='/icons/social-shake.svg' alt="Social shake" width={60} height={60} />
										</Avatar>
									)}
									<div
										className={`ml-${message.showAvatar ? "3" : "0"} max-w-3xl`}
									>
										{message.sender === "system" ? (
											<div className="flex justify-center items-center text-center bg-[#FFF1F0] text-[#A94004] px-4 py-3 rounded-lg text-base">
												{message.content}
											</div>
										) : (
											<div className="space-y-1">
												<div className="whitespace-pre-line bg-[#F9FAFB] border-[#EAECF0] max-w-xl px-4 py-3 rounded-lg text-sm border">
													{message.content}
												</div>
												<div className="flex justify-end text-xs text-gray-500 ">
													{message.timestamp}
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</ScrollArea>

				{/* Message input area */}
				<div className="border-t p-4 flex items-center">
					<Paperclip className="h-5 w-5 text-gray-400 mr-2" />
					<Input
						placeholder="Type your message here..."
						className="flex-1"
						value={messageInput}
						onChange={(e) => setMessageInput(e.target.value)}
					/>
					<div className="flex items-center ml-2">
						<Smile className="h-5 w-5 text-gray-400 mx-2" />
						<button className="bg-gray-100 rounded-full p-2">
							<Send className="h-5 w-5 text-gray-600" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ChatPage;

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/config/firebase";
import {
	doc,
	getDoc,
	updateDoc,
	arrayUnion,
	Timestamp,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Paperclip } from "lucide-react";
import Link from "next/link";

interface TicketDetailProps {
	ticketId: string;
  }

  export default function TicketDetail({ ticketId }: TicketDetailProps) {

	const router = useRouter();
	const { currentUser } = useAuth();

	interface Ticket {
		id: string;
		userId: string;
		subject: string;
		description: string;
		status: string;
		createdAt: Timestamp;
		lastUpdated: Timestamp;
		messages?: Array<{
			content: string;
			sender: string;
			senderId: string;
			timestamp: Timestamp;
		}>;
	}

	const [ticket, setTicket] = useState<Ticket | null>(null);
	const [message, setMessage] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [showResolveModal, setShowResolveModal] = useState(false);

	useEffect(() => {
		const fetchTicket = async () => {
			try {
				const ticketRef = doc(db, "tickets", ticketId);
				const ticketSnap = await getDoc(ticketRef);

				if (ticketSnap.exists()) {
					const data = ticketSnap.data();
					// Verify user owns the ticket or is admin
					if (
						data.userId === currentUser?.uid ||
						(currentUser as { uid: string; role?: string }).role === "admin"
					) {
						setTicket({
							id: ticketSnap.id,
							userId: data.userId,
							subject: data.subject,
							description: data.description,
							status: data.status,
							createdAt: data.createdAt,
							lastUpdated: data.lastUpdated,
							messages: data.messages || [],
						});
					} else {
						alert("You don't have permission to view this ticket");
						router.push("/brand/dashboard/help-support/history");
					}
				} else {
					alert("Ticket not found");
					router.push("/brand/dashboard/help-support/history");
				}
			} catch (error) {
				console.error("Error fetching ticket:", error);
				alert(
					"Error fetching ticket: " +
						(error instanceof Error ? error.message : String(error))
				);
			} finally {
				setIsLoading(false);
			}
		};

		fetchTicket();
	}, [ticketId, currentUser, router]);

	const sendMessage = async (e: { preventDefault: () => void }) => {
		e.preventDefault();
		if (!message.trim()) return;

		try {
			const ticketRef = doc(db, "tickets", ticketId);

			await updateDoc(ticketRef, {
				messages: arrayUnion({
					content: message,
					sender: currentUser?.displayName ?? currentUser?.email ?? "Unknown Sender",
					senderId: currentUser?.uid,
					timestamp: Timestamp.now(),
				}),
				lastUpdated: Timestamp.now(),
				status: ticket?.status === "closed" ? "reopened" : ticket?.status,
			});

			// Update local state
			setTicket((prev) => {
				if (!prev) return prev;
				if (!currentUser) return prev;

				return {
					...prev,
					messages: [
						...(prev.messages || []),
						{
							content: message,
							sender: currentUser.displayName ?? currentUser.email ?? "Unknown Sender",
							senderId: currentUser.uid,
							timestamp: Timestamp.now(),
						},
					],
					lastUpdated: Timestamp.now(),
					status: prev.status === "closed" ? "reopened" : prev.status,
				};
			});

			setMessage("");
		} catch (error) {
			console.error("Error sending message:", error);
			alert("Failed to send message. Please try again.");
		}
	};

	const markAsResolved = async () => {
		try {
			const ticketRef = doc(db, "tickets", ticketId);

			await updateDoc(ticketRef, {
				status: "resolved",
				lastUpdated: Timestamp.now(),
			});

			// Update local state
			setTicket((prev) => {
				if (!prev) return prev;
				return {
					...prev,
					status: "resolved",
					lastUpdated: Timestamp.now(),
				};
			});

			setShowResolveModal(false);
		} catch (error) {
			console.error("Error resolving ticket:", error);
			alert("Failed to resolve ticket. Please try again.");
		}
	};

	// Format date to display
	const formatDate = (timestamp: string | number | Timestamp | Date) => {
		if (!timestamp) return "N/A";

		const date =
			timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
		return date.toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	};

	// Get status badge based on ticket status
	const getStatusBadge = (status: string) => {
		const statusLower = status?.toLowerCase() || "";

		switch (statusLower) {
			case "open":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A]">
						• Open
					</span>
				);
			case "resolved":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E8F5E9] border border-[#66BB6A] text-[#1A1A1A]">
						✓ Resolved
					</span>
				);
			case "in progress":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
						• In Progress
					</span>
				);
			case "closed":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
						✓ Closed
					</span>
				);
			case "reopened":
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
						• Reopened
					</span>
				);
			default:
				return (
					<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
						{status}
					</span>
				);
		}
	};

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center h-64">
				<div className="inline-block h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-solid border-orange-500 border-r-transparent"></div>
				<p className="ml-2 text-gray-600">Loading ticket...</p>
			</div>
		);
	}

	if (!ticket) {
		return (
			<div className="text-center py-8">
				<p>Ticket not found or you don&apos;t have permission to view it.</p>
				<Link
					href="/support"
					className="text-orange-500 hover:underline mt-4 inline-block"
				>
					Return to Support
				</Link>
			</div>
		);
	}

	return (
		<div className="w-full bg-white rounded-lg p-6 border border-[#FFD9C3]">
			{/* Back button */}
			<div className="mb-4">
				<button
					onClick={() => window.history.back()}
					className="flex items-center text-gray-500 hover:text-gray-700"
				>
					<ArrowLeft className="w-5 h-5 mr-1" />
				</button>
			</div>

			{/* Ticket header */}
			<div className="mb-6">
				<div className="flex items-center gap-2 mb-1">
					<h1 className="text-xl font-semibold">
						Ticket #{ticket.id.substring(0, 4)}
					</h1>
					{getStatusBadge(ticket.status)}
				</div>
				<h2 className="text-lg font-medium text-gray-800">{ticket.subject}</h2>
				<div className="border-b border-[#6670854D] mt-4"></div>
			</div>

			{/* Chat area */}
			<div className="w-full">
				<div className="space-y-6">
					{/* Initial message */}
					<div className="flex flex-col items-start">
						<span className="font-medium textsm mb-1">You</span>
						<div className="bg-[#F9F2F0] rounded-md px-3 py-2 max-w-[75%]">
							<p className="text-gray-800">{ticket.description}</p>
						</div>
						<span className="text-xs text-gray-500 mt-1">
							{formatDate(ticket.createdAt)}
						</span>
					</div>

					{/* Message history */}
					{ticket.messages &&
						ticket.messages.map((msg, index) => {
							const isUser = msg.senderId === currentUser?.uid;

							return (
								<div
									key={index}
									className={`flex flex-col ${isUser ? "items-start" : "items-end"}`}
								>
									<span className="font-medium text-sm mb-1">
										{isUser ? "You" : "Support Team"}
									</span>
									<div
										className={`${
											isUser ? "bg-[#F9F2F0]" : "bg-[#F5F8FA]"
										} rounded-md px-3 py-2 max-w-[75%]`}
									>
										<p className="text-gray-800">{msg.content}</p>
									</div>
									<span className="text-xs text-gray-500 mt-1">
										{formatDate(msg.timestamp)}
									</span>
								</div>
							);
						})}
				</div>

				{/* Bottom action area */}
				<div className="mt-4">
					{/* Message input or support actions based on ticket status */}
					{ticket.status !== "resolved" && ticket.status !== "closed" ? (
						<div>
							<div className="mb-2">
								<h3 className="text-lg font-medium mb-2">Reply</h3>
							</div>
							<form onSubmit={sendMessage} className="flex flex-col">
								<div className="border border-gray-300 rounded-md p-2 mb-4">
									<textarea
										value={message}
										onChange={(e) => setMessage(e.target.value)}
										placeholder="Type your Response here..."
										className="w-full min-h-20 outline-none resize-none"
									/>
									<div className="flex justify-between items-center mt-2">
										<button type="button" className="text-gray-500">
											<Paperclip size={18} />
										</button>
										<button
											type="submit"
											className="flex items-center bg-black text-white px-4 py-2 rounded-md"
										>
											<Send size={16} className="mr-2" /> Send Reply
										</button>
									</div>
								</div>
								<div className="flex justify-end gap-4 mt-3 border-t border-[#6670854D] pt-6">
									<button
										type="button"
										className="text-[#667085] px-4 py-2 border border-[#6670854D] rounded-md"
										onClick={() => {}}
									>
										Close
									</button>
									<button
										type="button"
										className="bg-orange-500 text-white px-4 py-2 rounded-md"
										onClick={() => setShowResolveModal(true)}
									>
										Mark as Resolved
									</button>
								</div>
							</form>
						</div>
					) : (
						<div className="flex justify-end mt-3 border-t border-[#6670854D] pt-6">
							<Link
								href="/brand/dashboard/help-support"
								className="text-center text-[#667085] px-4 py-2 rounded-md border border-[#6670854D] hover:bg-gray-200"
							>
								Go to Contact Support
							</Link>
						</div>
					)}
				</div>
			</div>

			{/* Resolution confirmation modal */}
			{showResolveModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 max-w-md w-full">
						<h3 className="text-xl font-bold mb-2">Mark Ticket as Resolved?</h3>
						<p className="text-gray-600 mb-4">
							<span className="font-medium">
								Ticket #{ticket.id.substring(0, 4)}
							</span>{" "}
							will be marked as resolved. This will close the ticket and notify
							the support team that your issue has been addressed.
						</p>

						<div className="bg-[#FDEFE7] p-4 rounded-lg mb-6">
							<div className="flex items-start">
								<div className="flex-shrink-0">
									<svg
										className="h-5 w-5 text-orange-400"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
								<div className="ml-2">
									<p className="text-sm text-[#BE4501]">
										You can still view this ticket in your history, but
										you&apos;ll need to create a new ticket if the issue
										persists.
									</p>
								</div>
							</div>
						</div>

						<div className="flex justify-end gap-3">
							<Button
								onClick={() => setShowResolveModal(false)}
								className="shadow-none text-[#667085]"
							>
								Cancel
							</Button>
							<Button
								onClick={markAsResolved}
								className="bg-orange-500 hover:bg-orange-600 text-white"
							>
								Confirm Resolution ✓
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

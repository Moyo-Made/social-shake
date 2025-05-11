import { useState } from "react";
import Link from "next/link";
import ActionButton from "./ActionButton";
import CancelApplicationModal from "./CancelApplicationModal";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

// Component to determine what action buttons to show based on status
interface Contest {
	contestId: string;
	contestType: string;
	status: string;
	interestId?: string;
	channelId?: string;
	brandId?: string;  // Used for sending messages
	brandName?: string; // Added for display in conversation
	brandLogo?: string; // Added for avatar in conversation
}

const RenderActionButtons = ({
	contest,
	refreshData,
}: {
	contest: Contest;
	refreshData: () => void;
}) => {
	const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
	const { currentUser } = useAuth();
	const router = useRouter();

	const handleSendMessage = async (brandId: string) => {
		if (!currentUser) {
			alert("You need to be logged in to send messages");
			return;
		}

		try {
			console.log("Starting conversation with brand:", brandId);

			// First, fetch brand information
			const brandResponse = await fetch(`/api/admin/brand-approval?userId=${brandId}`);
				
			if (!brandResponse.ok) {
				throw new Error("Failed to fetch brand information");
			}
			const brandData = await brandResponse.json();
			
			const response = await fetch("/api/createConversation", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					currentUserId: currentUser.uid,
					creatorId: brandId,
					userData: {
						name: currentUser.displayName || "User",
						avatar: currentUser.photoURL || "/icons/default-avatar.svg",
						username: currentUser.email?.split("@")[0] || "",
					},
					creatorData: {
						name: brandData.name || contest.brandName || "Brand",
						avatar: brandData.logoUrl || contest.brandLogo || "/icons/default-brand-avatar.svg",
						username: brandData.username || brandId,
					},
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to handle conversation");
			}

			// The endpoint returns conversationId for both new and existing conversations
			console.log(
				`Conversation ${response.status === 201 ? "created" : "found"}`
			);
			router.push(
				`/creator/dashboard/messages?conversation=${data.conversationId}`
			);
		} catch (error) {
			console.error("Error handling conversation:", error);
			alert("Failed to open conversation. Please try again.");
		}
	};

	// Function to handle removing interest (unsaving)
	const handleRemoveInterest = async () => {
		try {
			if (!currentUser) {
				console.error("User not logged in");
				return;
			}

			const response = await fetch("/api/contests/toggle-saved", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: currentUser.uid,
					contestId: contest.contestId,
					currentSavedState: true,
					interestId: contest.interestId,
				}),
			});

			if (response.ok) {
				// Refresh the contests list after removal
				refreshData();
			} else {
				const errorData = await response.json();
				console.error("Failed to remove interest:", errorData.message);
			}
		} catch (error) {
			console.error("Error removing interest:", error);
		}
	};

	// Function to handle successful application cancellation
	const handleCancelSuccess = () => {
		refreshData();
	};

	switch (contest.status) {
		case "joined":
			return (
				<>
					{contest.contestType === "GMV" ? (
						<Link
							href={`/creator/dashboard/contest/gmv`}
							className="flex-1"
						>
							<ActionButton
								text="View GMV Data"
								icon="arrow-right"
								primary
								fullWidth
							/>
						</Link>
					) : (
						<Link
							href={`/creator/dashboard/contest/leaderboard`}
							className="flex-1"
						>
							<ActionButton
								text="View Leaderboard"
								icon="arrow-right"
								primary
								fullWidth
							/>
						</Link>
					)}
					<button
						onClick={() => contest.brandId ? handleSendMessage(contest.brandId) : alert("Brand information not available")}
						className="flex-1"
					>
						<ActionButton text="Message Brand" icon="mail" secondary fullWidth />
					</button>
				</>
			);
		case "pending":
			return (
				<>
					<Link
						href={`/creator/dashboard/contest/${contest.contestId}`}
						className="flex-1"
					>
						<ActionButton
							text="View Contest"
							icon="arrow-right"
							primary
							fullWidth
						/>
					</Link>
					<ActionButton
						text="Cancel Application"
						icon="x"
						danger
						onClick={() => setIsCancelModalOpen(true)}
					/>
					<CancelApplicationModal
						isOpen={isCancelModalOpen}
						onClose={() => setIsCancelModalOpen(false)}
						contestId={contest.contestId}
						onCancelSuccess={handleCancelSuccess}
					/>
				</>
			);
		case "interested":
			return (
				<>
					<Link
						href={`/creator/dashboard/contest/${contest.contestId}`}
						className="flex-1"
					>
						<ActionButton
							text="View Contest"
							icon="arrow-right"
							primary
							fullWidth
						/>
					</Link>
					<ActionButton
						text="Remove Interest"
						icon="bookmark"
						secondary
						onClick={handleRemoveInterest}
					/>
				</>
			);
		case "rejected":
			return (
				<Link
					href={`/creator/dashboard/contest/${contest.contestId}`}
					className="flex-1"
				>
					<ActionButton
						text="View Contest"
						icon="arrow-right"
						primary
						fullWidth
					/>
				</Link>
			);
		case "completed":
			return (
				<>
					<Link
						href={`/creator/dashboard/contest/results/${contest.contestId}`}
						className="flex-1"
					>
						<ActionButton
							text="View Results"
							icon="arrow-right"
							primary
							fullWidth
						/>
					</Link>
					<button
						onClick={() => contest.brandId ? handleSendMessage(contest.brandId) : alert("Brand information not available")}
						className="flex-1"
					>
						<ActionButton text="Message Brand" icon="mail" secondary fullWidth />
					</button>
				</>
			);
		case "approved":
			return (
				<Link
					href={`/creator/dashboard/contest/${contest.contestId}`}
					className="flex-1"
				>
					<ActionButton
						text="Join Contest"
						icon="arrow-right"
						primary
						fullWidth
					/>
				</Link>
			);
		default:
			return (
				<Link
					href={`/creator/dashboard/contest/${contest.contestId}`}
					className="flex-1"
				>
					<ActionButton
						text="View Contest"
						icon="arrow-right"
						primary
						fullWidth
					/>
				</Link>
			);
	}
};

export default RenderActionButtons;
import { useState } from "react";
import Link from "next/link";
import ActionButton from "./ActionButton";
import CancelApplicationModal from "./CancelApplicationModal";
import { useAuth } from "@/context/AuthContext";

// Component to determine what action buttons to show based on status
interface Contest {
	contestId: string;
	contestType: string;
	status: string;
	interestId?: string;
	channelId?: string;
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
					<Link
						href={`/creator/dashboard/messages/${contest.channelId || contest.contestId}`}
						className="flex-1"
					>
						<ActionButton text="View Channel" icon="mail" secondary fullWidth />
					</Link>
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
					<Link
						href={`/creator/dashboard/messages/${contest.channelId || contest.contestId}`}
						className="flex-1"
					>
						<ActionButton text="View Channel" icon="mail" secondary fullWidth />
					</Link>
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

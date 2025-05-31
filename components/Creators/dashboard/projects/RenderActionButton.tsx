import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ActionButton from "../contests/ActionButton";
import CancelApplicationModal from "./CancelProjectApplicationModal";
import { useRouter } from "next/navigation";


// Brand profile interface
export interface BrandProfile {
	id?: string;
	userId: string;
	email?: string;
	brandName: string;
	logoUrl: string;
}

// Component to determine what action buttons to show based on status
interface Project {
	projectId: string;
	projectType: string;
	status: string;
	interestId?: string;
	channelId?: string;
}

const RenderActionButtons = ({
	project,
	refreshData,
	brandProfile, // Add brandProfile as a prop
}: {
	project: Project;
	refreshData: () => void;
	brandProfile?: BrandProfile | null; // Make it optional
}) => {
	const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
	const { currentUser } = useAuth();
	const router = useRouter();
	
	const handleSendMessageToBrand = async () => {
		if (!currentUser) {
			alert("You need to be logged in to send messages");
			return;
		}
	
		// Make sure we have the brand profile data
		if (!brandProfile) {
			alert("Brand information is still loading. Please try again.");
			return;
		}
	
		try {
			const response = await fetch("/api/createConversation", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					currentUserId: currentUser.uid,
					brandId: brandProfile.userId,
					userData: {
						name: currentUser.displayName || "User",
						avatar: currentUser.photoURL || "/icons/default-avatar.svg",
						username: currentUser.email?.split("@")[0] || "",
					},
					brandData: {
						name: brandProfile.brandName,
						avatar: brandProfile.logoUrl,
						username: brandProfile.email?.split("@")[0] || "",
					},
				}),
			});
	
			const data = await response.json();
	
			if (!response.ok) {
				throw new Error(data.error || "Failed to create conversation");
			}
	
			// Navigate to chat page with this conversation
			router.push(`/creator/dashboard/messages?conversation=${data.conversationId}`);
		} catch (error) {
			console.error("Error creating conversation:", error);
			alert("Failed to start conversation. Please try again.");
		}
	};

	// Function to handle removing interest (unsaving)
	const handleRemoveInterest = async () => {
		try {
			if (!currentUser) {
				console.error("User not logged in");
				return;
			}

			const response = await fetch("/api/projects/toggle-saved", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: currentUser.uid,
					projectId: project.projectId,
					currentSavedState: true,
					interestId: project.interestId,
				}),
			});

			if (response.ok) {
				// Refresh the projects list after removal
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

	switch (project.status) {
		case "pending":
			return (
				<>
					<Link
						href={`/creator/dashboard/project/${project.projectId}`}
						className="flex-1"
					>
						<ActionButton
							text="View Project"
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
						projectId={project.projectId}
						onCancelSuccess={handleCancelSuccess}
					/>
				</>
			);
		case "interested":
			return (
				<>
					<Link
						href={`/creator/dashboard/project/${project.projectId}`}
						className="flex-1"
					>
						<ActionButton
							text="View Project"
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
			return;
		case "completed":
			return (
				<>
					<Link
						href={`/creator/dashboard/project/results/${project.projectId}`}
						className="flex-1"
					>
						<ActionButton
							text="Manage Project"
							icon="arrow-right"
							primary
							fullWidth
						/>
					</Link>
				</>
			);
		case "approved":
			return (
				<>
					<Link
						href={`/creator/dashboard/project/manage-project/${project.projectId}`}
						className="flex-1"
					>
						<ActionButton
							text="Manage Project"
							icon="arrow-right"
							primary
							fullWidth
						/>
					</Link>
					<div className="flex-1">
						<ActionButton
							text="Message Brand"
							icon="message"
							secondary
							onClick={() => handleSendMessageToBrand()}
							fullWidth
						/>
					</div>
				</>
			);
		default:
			return (
				<Link
					href={`/creator/dashboard/project/${project.projectId}`}
					className="flex-1"
				>
					<ActionButton
						text="View Project"
						icon="arrow-right"
						primary
						fullWidth
					/>
				</Link>
			);
	}
};

export default RenderActionButtons;
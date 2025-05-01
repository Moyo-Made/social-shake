import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ActionButton from "../contests/ActionButton";
import CancelApplicationModal from "./CancelProjectApplicationModal";

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
}: {
	project: Project;
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
					<Link
						href={`/creator/dashboard/messages/${project.channelId || project.projectId}`}
						className="flex-1"
					>
						<ActionButton
							text="Message Brand"
							icon="message"
							secondary
							onClick={handleRemoveInterest}
							fullWidth
						/>
					</Link>
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

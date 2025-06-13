import React, { useState } from "react";
import { Briefcase, Check, X, Eye, Clock } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import ProjectDetailsModal from "./ProjectDetailsModal";

interface ProjectInvitationsSectionProps {
	userId: string;
}

interface ProjectDetails {
	id: string;
	title: string;
	description: string;
	requirements: string[];
	deliverables: string[];
	timeline: {
		startDate: string;
		endDate: string;
		duration: string;
	};
	budget: {
		amount: number;
		currency: string;
		paymentType: string;
	};
	brand: {
		name: string;
		logo?: string;
	};
	categories: string[];
	targetAudience?: string;
}

const ProjectInvitationsSection: React.FC<ProjectInvitationsSectionProps> = ({
	userId,
}) => {
	const [processingAction, setProcessingAction] = useState<string | null>(null);
	const [showDetailsModal, setShowDetailsModal] = useState<string | null>(null);
	const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(
		null
	);
	const [loadingDetails, setLoadingDetails] = useState(false);
	const { currentUser } = useAuth();

	const { notifications, markAsRead, refetch } = useNotifications();

	// Filter for project invitation notifications that haven't been responded to
	const projectInvitations = notifications.filter(
		(notification) =>
			notification.type === "project_invitation" && !notification.responded
	);

	// Fetch project details
	const fetchProjectDetails = async (projectId: string) => {
		setLoadingDetails(true);
		try {
			const response = await fetch(`/api/projects/${projectId}/details`);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to fetch project details");
			}

			// The issue is here - you need to access data.data, not data.project
			if (data.success && data.exists && data.data) {
				// Transform the API response to match your ProjectDetails interface
				const projectData = data.data;

				const transformedProject: ProjectDetails = {
					id: projectData.projectId,
					title: projectData.projectDetails.projectName,
					description: projectData.projectDetails.projectDescription,
					requirements: [
						`Content Type: ${projectData.projectRequirements.contentType}`,
						`Platform: ${projectData.projectRequirements.platform.join(", ")}`,
						`Aspect Ratio: ${projectData.projectRequirements.aspectRatio}`,
						`Duration: ${projectData.projectRequirements.duration}`,
						`Video Type: ${projectData.projectRequirements.videoType}`,
						...(projectData.projectRequirements.script
							? [`Script: ${projectData.projectRequirements.script}`]
							: []),
					],
					deliverables: [
						`${projectData.creatorPricing.totalVideos} video(s)`,
						`${projectData.projectRequirements.duration} duration`,
						`${projectData.projectRequirements.aspectRatio} format`,
					],
					timeline: {
						startDate: projectData.createdAt,
						endDate: projectData.updatedAt, // You might want to calculate this based on project duration
						duration: projectData.projectRequirements.duration,
					},
					budget: {
						amount: projectData.creatorPricing.totalAmount,
						currency: "$", // Assuming USD, you might want to make this dynamic
						paymentType: "Per project",
					},
					brand: {
						name: projectData.brandInfo.brandName,
						logo: undefined, // No logo in the API response
					},
					categories: [projectData.projectDetails.projectType],
					targetAudience: `${projectData.creatorPricing.ageGroup} ${projectData.creatorPricing.gender}`,
				};

				setProjectDetails(transformedProject);
			} else {
				throw new Error("Project not found or invalid response structure");
			}
		} catch (error) {
			console.error("Error fetching project details:", error);
			toast.error("Failed to load project details");
		} finally {
			setLoadingDetails(false);
		}
	};

	const handleAccept = async (notificationId: string, projectId: string) => {
		setProcessingAction(`accept-${notificationId}`);

		try {
			const response = await fetch("/api/projects/accept-invitation", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: currentUser?.uid,
					notificationId,
					projectId,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to accept project invitation");
			}

			await markAsRead(notificationId);
			await refetch();

			// Close modal and show success
			setShowDetailsModal(null);
			toast.success("Project invitation accepted! You've joined the project.");
		} catch (error) {
			console.error("Error accepting project invitation:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to accept project invitation"
			);
		} finally {
			setProcessingAction(null);
		}
	};

	const handleReject = async (notificationId: string, projectId: string) => {
		setProcessingAction(`reject-${notificationId}`);

		try {
			const response = await fetch("/api/projects/reject-invitation", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId,
					notificationId,
					projectId,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to reject project invitation");
			}

			await markAsRead(notificationId);
			await refetch();

			// Close modal and show success
			setShowDetailsModal(null);
			toast.success("Project invitation declined.");
		} catch (error) {
			console.error("Error rejecting project invitation:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to reject project invitation"
			);
		} finally {
			setProcessingAction(null);
		}
	};

	const handleViewProject = async (
		projectId: string,
		notificationId: string
	) => {
		setShowDetailsModal(notificationId);
		await fetchProjectDetails(projectId);
	};

	// Format time ago
	const timeAgo = (date: Date) => {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return "Just now";
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return `${diffDays}d ago`;
	};

	// Don't render if there are no project invitations
	if (projectInvitations.length === 0) {
		return null;
	}

	// Get current invitation for modal actions
	const currentInvitation = projectInvitations.find(
		(inv) => inv.id === showDetailsModal
	);

	return (
		<div className="mb-8">
			<div className="bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-500 rounded-lg p-6 shadow-sm">
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-orange-100 rounded-full">
						<Briefcase className="w-5 h-5 text-orange-600" />
					</div>
					<div>
						<h2 className="text-lg font-semibold text-gray-900">
							Project Invitations
						</h2>
						<p className="text-sm text-gray-600">
							You have {projectInvitations.length} pending project invitation
							{projectInvitations.length > 1 ? "s" : ""}
						</p>
					</div>
				</div>

				<div className="space-y-4">
					{projectInvitations.map((invitation) => (
						<div
							key={invitation.id}
							className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-2">
										<h3 className="font-semibold text-gray-900 truncate">
											{invitation.title}
										</h3>
										<div className="flex items-center gap-1 text-xs text-gray-500">
											<Clock className="w-3 h-3" />
											{timeAgo(invitation.createdAt)}
										</div>
									</div>

									<div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
										<p className="text-sm text-blue-800">
											<strong>
												You&apos;ve been directly selected for this project!
											</strong>{" "}
											No application needed - accepting this invitation allows
											you to make video submissions for this project.
										</p>
									</div>

									{invitation.brandName && (
										<div className="flex gap-2 text-sm text-gray-500 mb-3">
											<span className="font-normal">
												From:
												<span className="font-medium">
													{" "}
													{invitation.brandName}
												</span>
											</span>
											{invitation.projectTitle && (
												<>
													{" "}
													•{" "}
													<span className="font-normal">
														Project:{" "}
														<span className="font-medium">
															{" "}
															{invitation.projectTitle}
														</span>
													</span>
												</>
											)}
										</div>
									)}

									<div className="flex items-center gap-2">
										{invitation.projectId && (
											<>
												<button
													onClick={() =>
														handleAccept(invitation.id!, invitation.projectId!)
													}
													disabled={
														processingAction === `accept-${invitation.id}`
													}
													className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
												>
													{processingAction === `accept-${invitation.id}` ? (
														<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
													) : (
														<Check className="w-4 h-4" />
													)}
													Accept & Join Project
												</button>

												<button
													onClick={() =>
														handleReject(invitation.id!, invitation.projectId!)
													}
													disabled={
														processingAction === `reject-${invitation.id}`
													}
													className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors disabled:opacity-50"
												>
													{processingAction === `reject-${invitation.id}` ? (
														<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
													) : (
														<X className="w-4 h-4" />
													)}
													Reject
												</button>

												<button
													onClick={() =>
														handleViewProject(
															invitation.projectId!,
															invitation.id!
														)
													}
													disabled={
														processingAction === `view-${invitation.id}`
													}
													className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
												>
													{processingAction === `view-${invitation.id}` ? (
														<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
													) : (
														<Eye className="w-4 h-4" />
													)}
													View Details
												</button>
											</>
										)}
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Project Details Modal */}
			<ProjectDetailsModal
				isOpen={!!showDetailsModal}
				onClose={() => setShowDetailsModal(null)}
				projectDetails={projectDetails}
				isLoading={loadingDetails}
				onAccept={() => {
					if (currentInvitation?.projectId) {
						handleAccept(showDetailsModal!, currentInvitation.projectId);
					}
				} }
				onReject={() => {
					if (currentInvitation?.projectId) {
						handleReject(showDetailsModal!, currentInvitation.projectId);
					}
				} }
				processingAccept={processingAction === `accept-${showDetailsModal}`}
				processingReject={processingAction === `reject-${showDetailsModal}`} notification={null}			/>
		</div>
	);
};

export default ProjectInvitationsSection;

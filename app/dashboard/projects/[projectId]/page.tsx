"use client";

import { useParams } from "next/navigation";
import ProjectDetailPage from "@/components/brandProjects/viewProject/ProjectDetailsPage";
import SideNavLayout from "@/components/brandProfile/dashboard/SideNav";

export default function ProjectPage() {
	const params = useParams();
	const projectId = params.projectId as string;

	// Add some validation or logging here
	console.log("Project ID from URL params:", projectId);

	if (!projectId) {
		return (
			<div className="p-8 text-center text-red-500">
				Missing project ID in URL
			</div>
		);
	}

	return (
		<SideNavLayout>
			<ProjectDetailPage projectId={projectId} />
		</SideNavLayout>
	);
}

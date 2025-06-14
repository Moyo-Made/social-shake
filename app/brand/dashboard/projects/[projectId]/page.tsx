"use client";

import { useParams } from "next/navigation";
import ProjectDetailPage from "@/components/brand/brandProjects/viewProject/ProjectDetailsPage";

export default function ProjectPage() {
	const params = useParams();
	const projectId = params.projectId as string;

	if (!projectId) {
		return (
			<div className="p-8 text-center text-red-500">
				Missing project ID in URL
			</div>
		);
	}

	return <ProjectDetailPage projectId={projectId} />;
}

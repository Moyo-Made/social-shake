import ManageProjects from "@/components/Creators/dashboard/projects/ManageProjects";
import React from "react";

interface PageProps {
	params: Promise<{
		projectId: string;
	}>;
	searchParams: Promise<{
		contestId?: string;
		applicationId?: string;
	}>;
}

const Page: React.FC<PageProps> = async ({ params, searchParams }) => {
	const resolvedParams = await params;
	const resolvedSearchParams = await searchParams;

	return (
		<div>
			<ManageProjects 
				projectId={resolvedParams.projectId} 
				applicationId={resolvedSearchParams.applicationId || ""} 
				contestId={resolvedSearchParams.contestId || ""} 
			/>
		</div>
	);
};

export default Page;
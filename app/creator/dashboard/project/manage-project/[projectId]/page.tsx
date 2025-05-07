
import ManageProjects from "@/components/Creators/dashboard/projects/ManageProjects";
import React from "react";

interface PageProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	params: any; // Replace 'any' with the appropriate type if known
}

const Page: React.FC<PageProps> = ({ params }) => {
	return (
		<div>
			<ManageProjects projectId={params.projectId} applicationId={params.applicationId} />
		</div>
	);
};

export default Page;

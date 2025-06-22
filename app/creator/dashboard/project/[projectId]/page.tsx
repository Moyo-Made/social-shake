
import ProjectDetailsPage from "@/components/Creators/dashboard/projects/ProjectDetailsPage";
import React from "react";

interface PageProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	params: any; // Replace 'any' with the appropriate type if known
}

const Page: React.FC<PageProps> = ({ params }) => {
	return (
		<div>
			<ProjectDetailsPage params={params} />
		</div>
	);
};

export default Page;

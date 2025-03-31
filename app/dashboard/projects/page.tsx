import SideNavLayout from "@/components/brandProfile/dashboard/SideNav";
import ProjectDashboard from "@/components/brandProjects/viewProject/ProjectDashboard";
import React from "react";

const Page = () => {
	return (
		<SideNavLayout>
			<ProjectDashboard />
		</SideNavLayout>
	);
};

export default Page;

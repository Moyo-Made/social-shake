import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";
import { ProjectFormProvider } from "@/components/brand/brandProjects/ProjectFormContext";
import ProjectDashboard from "@/components/brand/brandProjects/viewProject/ProjectDashboard";
import React from "react";

const Page = () => {
	return (
		<ProjectFormProvider>
			<SideNavLayout>
				<ProjectDashboard />
			</SideNavLayout>
		</ProjectFormProvider>
	);
};

export default Page;

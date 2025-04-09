import SideNavLayout from "@/components/brandProfile/dashboard/SideNav";
import { ProjectFormProvider } from "@/components/brandProjects/ProjectFormContext";
import ProjectDashboard from "@/components/brandProjects/viewProject/ProjectDashboard";
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

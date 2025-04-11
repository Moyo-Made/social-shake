import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";
import ProjectForm from "@/components/brand/brandProjects/ProjectForm";
import React from "react";

const page = () => {
	return (
		<SideNavLayout>
			<ProjectForm />
		</SideNavLayout>
	);
};

export default page;

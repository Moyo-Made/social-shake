import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";
import { ProjectFormProvider } from "@/components/brand/brandProjects/ProjectFormContext";
import AccountSettings from "@/components/brand/settings/AccountSettings";
import React from "react";

const page = () => {
	return (
		<ProjectFormProvider>
			<SideNavLayout>
				<AccountSettings />
			</SideNavLayout>
		</ProjectFormProvider>
	);
};

export default page;

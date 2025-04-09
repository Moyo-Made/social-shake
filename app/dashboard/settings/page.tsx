import SideNavLayout from "@/components/brandProfile/dashboard/SideNav";
import { ProjectFormProvider } from "@/components/brandProjects/ProjectFormContext";
import AccountSettings from "@/components/settings/AccountSettings";
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

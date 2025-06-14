import { ProjectFormProvider } from "@/components/brand/brandProjects/ProjectFormContext";
import AccountSettings from "@/components/brand/settings/AccountSettings";
import React from "react";

const page = () => {
	return (
		<ProjectFormProvider>
				<AccountSettings />
		</ProjectFormProvider>
	);
};

export default page;

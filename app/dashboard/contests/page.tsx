import SideNavLayout from "@/components/brandProfile/dashboard/SideNav";
import ContestDashboard from "@/components/brandProfile/dashboard/ViewContests/ContestDashboard";
import React from "react";

const Page = () => {
	return (
		<SideNavLayout>
			<ContestDashboard />
		</SideNavLayout>
	);
};

export default Page;

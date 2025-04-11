import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";
import ContestDashboard from "@/components/brand/brandProfile/dashboard/ViewContests/ContestDashboard";
import React from "react";

const Page = () => {
	return (
		<SideNavLayout>
			<ContestDashboard />
		</SideNavLayout>
	);
};

export default Page;

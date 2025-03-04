import SideNavLayout from "@/components/dashboard/SideNav";
import ContestDashboard from "@/components/dashboard/ViewContests/ContestDashboard";
import React from "react";

const page = () => {
	return (
		<SideNavLayout>
		

			<ContestDashboard />
			
		</SideNavLayout>
	);
};

export default page;

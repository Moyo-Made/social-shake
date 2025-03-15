import SideNavLayout from "@/components/dashboard/SideNav";
import ContestDashboard from "@/components/dashboard/ViewContests/ContestDashboard";
import React from "react";

const page = ({contestId} : { contestId: string }) => {
	return (
		<SideNavLayout>
			<ContestDashboard userId={contestId} />
		</SideNavLayout>
	);
};

export default page;

import SideNavLayout from "@/components/dashboard/SideNav";
import ContestDetailPage from "@/components/dashboard/ViewContests/ContestDetails";
import React from "react";

const page = () => {
	return (
		<SideNavLayout>
			<ContestDetailPage />
		</SideNavLayout>
	);
};

export default page;

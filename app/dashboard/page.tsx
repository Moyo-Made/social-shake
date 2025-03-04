import EmptyContest from "@/components/dashboard/Contests";
import SideNavLayout from "@/components/dashboard/SideNav";
import React from "react";

const page = () => {
	return (
		<SideNavLayout>
			<EmptyContest />
		</SideNavLayout>
	);
};

export default page;

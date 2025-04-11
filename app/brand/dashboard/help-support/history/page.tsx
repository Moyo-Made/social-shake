import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";
import SupportHistory from "@/components/brand/help-and-support/TicketHistory";
import React from "react";

const page = () => {
	return (
		<SideNavLayout>
			<SupportHistory />
		</SideNavLayout>
	);
};

export default page;

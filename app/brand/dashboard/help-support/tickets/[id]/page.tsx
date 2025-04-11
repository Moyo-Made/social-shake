import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";
import React from "react";
import TicketDetailContainer from "./TicketDetailContainer";

export default function TicketPage() {
	return (
		<SideNavLayout>
			<div className="w-full p-6">
				<TicketDetailContainer />
			</div>
		</SideNavLayout>
	);
}

import SideNavLayout from "@/components/brandProfile/dashboard/SideNav";
import TicketDetail from "@/components/help-and-support/TicketDetails";
import React from "react";

export default async function Page({ params }: { params: { id: string } }) {
	return (
		<SideNavLayout>
			<div className="w-full p-6">
				<TicketDetail params={{ id: params.id.toString() }} />
			</div>
		</SideNavLayout>
	);
}

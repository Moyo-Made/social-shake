import SideNavLayout from "@/components/brandProfile/dashboard/SideNav";
import Transactions from "@/components/transactions/Transactions";
import React from "react";

const page = () => {
	return (
		<div>
			<SideNavLayout>
				<Transactions />
			</SideNavLayout>
		</div>
	);
};

export default page;

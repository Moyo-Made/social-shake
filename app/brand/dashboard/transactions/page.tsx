import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";
import Transactions from "@/components/brand/brandProfile/transactions/Transactions";
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

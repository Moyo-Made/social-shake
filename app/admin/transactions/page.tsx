import AdminPaymentsDashboard from "@/components/admin/AdminPayouts";
import SideNavLayout from "@/components/admin/AdminSideNav";
import React from "react";

const page = () => {
	return (
		<div>
			<SideNavLayout>
				<AdminPaymentsDashboard />
			</SideNavLayout>
		</div>
	);
};

export default page;

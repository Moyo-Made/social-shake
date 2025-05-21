import SideNavLayout from "@/components/admin/AdminSideNav";
import AdminPayoutsPage from "@/components/admin/CreatorPayouts";
import React from "react";


const page = () => {
	return (
		<div> 
			<SideNavLayout>
				<AdminPayoutsPage />
			</SideNavLayout>
		</div>
	);
};

export default page;

import BrandProfileDisplay from "@/components/brandProfile/dashboard/BrandProfileDisplay";
import SideNavLayout from "@/components/brandProfile/dashboard/SideNav";
import React from "react";

const page = () => {
	return (
		<SideNavLayout>
			<BrandProfileDisplay />
		</SideNavLayout>
	);
};

export default page;

import BrandProfileDisplay from "@/components/brand/brandProfile/dashboard/BrandProfileDisplay";
import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";
import React from "react";

const page = () => {
	return (
		<SideNavLayout>
			<BrandProfileDisplay />
		</SideNavLayout>
	);
};

export default page;

import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";
import CreatorMarketplace from "@/components/brand/brandProfile/dashboard/creators/AllCreators";
import React from "react";

const page = () => {
	return (
		<SideNavLayout>
			<CreatorMarketplace />
		</SideNavLayout>
	);
};

export default page;

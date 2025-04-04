import SideNavLayout from "@/components/brandProfile/dashboard/SideNav";
import CreatorMarketplace from "@/components/creators/AllCreators";
import React from "react";

const page = () => {
	return (
		<SideNavLayout>
			<CreatorMarketplace />
		</SideNavLayout>
	);
};

export default page;

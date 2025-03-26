"use client";

import React from "react";
import ContestForm from "@/components/brandProfile/dashboard/newContest/ContestForm";
import SideNavLayout from "@/components/brandProfile/dashboard/SideNav";

const page = () => {
	return (
		<SideNavLayout>
			<ContestForm />
		</SideNavLayout>
	);
};

export default page;

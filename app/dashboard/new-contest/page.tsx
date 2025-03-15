"use client";

import React from "react";
import ContestForm from "@/components/dashboard/newContest/ContestForm";
import SideNavLayout from "@/components/dashboard/SideNav";

const page = () => {
	return (
		<SideNavLayout>
			<ContestForm />
		</SideNavLayout>
	);
};

export default page;

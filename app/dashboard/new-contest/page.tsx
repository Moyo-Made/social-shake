"use client";

import React from "react";
import ContestForm from "@/components/dashboard/newContest/ContestForm";
import NewContestSideNavLayout from "@/components/dashboard/NewContestSideNav";

const page = () => {
	return (
		<NewContestSideNavLayout>
			<ContestForm />
		</NewContestSideNavLayout>
	);
};

export default page;

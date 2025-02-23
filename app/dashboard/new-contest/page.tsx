import ContestForm from "@/components/dashboard/newContest/Basic";
import NewContestSideNavLayout from "@/components/dashboard/NewContestSideNav";
import React from "react";

const page = () => {
	return (
		<NewContestSideNavLayout>
			<div><ContestForm /></div>
		</NewContestSideNavLayout>
	);
};

export default page;

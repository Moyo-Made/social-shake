import ContestForm from "@/components/dashboard/newContest/ContestForm";
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

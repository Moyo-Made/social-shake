import { ContestFormProvider } from "@/components/brand/brandProfile/dashboard/newContest/ContestFormContext";
import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";
import ContestDetails from "@/components/brand/brandProfile/dashboard/ViewContests/ContestDetails";
import React from "react";

interface PageParams {
	contestId: string;
}

const ContestDetailsPage = async ({ params }: { params: PageParams }) => {
	const { contestId } = params;
	return (
		<SideNavLayout>
			<ContestFormProvider>
				<ContestDetails contestId={contestId} />
			</ContestFormProvider>
		</SideNavLayout>
	);
};

export default ContestDetailsPage;

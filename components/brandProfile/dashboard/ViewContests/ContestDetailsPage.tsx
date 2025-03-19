import { ContestFormProvider } from "@/components/brandProfile/dashboard/newContest/ContestFormContext";
import SideNavLayout from "@/components/brandProfile/dashboard/SideNav";
import ContestDetails from "@/components/brandProfile/dashboard/ViewContests/ContestDetails";
import React from "react";

interface PageParams {
	contestId: string;
}

const ContestDetailsPage = ({ params }: { params: PageParams }) => {
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

import { ContestFormProvider } from "@/components/brand/brandProfile/dashboard/newContest/ContestFormContext";
import React from "react";
import ContestDetails from "./ContestDetails";

interface PageParams {
	contestId: string;
}

const ContestDetailsPage = async ({ params }: { params: PageParams }) => {
  // Await the params before accessing properties
  const resolvedParams = await Promise.resolve(params);
  const contestId = resolvedParams.contestId;

	return (
		<ContestFormProvider>
			<ContestDetails contestId={contestId} />
		</ContestFormProvider>
	);
};

export default ContestDetailsPage;

import { ContestFormProvider } from "@/components/dashboard/newContest/ContestFormContext";
import SideNavLayout from "@/components/dashboard/SideNav";
import ContestDetailPage from "@/components/dashboard/ViewContests/ContestDetails";
import React from "react";

interface PageParams {
	contestId: string;
  }

 const page = ({ params }: { params: PageParams }) => {
	const { contestId } = params;
  return (
    <SideNavLayout>
      <ContestFormProvider>
        <ContestDetailPage contestId={contestId} />
      </ContestFormProvider>
    </SideNavLayout>
  );
}

export default page;
import SideNavLayout from "@/components/dashboard/SideNav";
import ContestDashboard from "@/components/dashboard/ViewContests/ContestDashboard";
import React from "react";

interface PageParams {
  contestId: string;
}

const Page = ({ params }: { params: PageParams }) => {
  const { contestId } = params;
  
  return (
    <SideNavLayout>
      <ContestDashboard userId={contestId} />
    </SideNavLayout>
  );
};

export default Page;
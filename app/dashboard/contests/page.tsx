import SideNavLayout from "@/components/dashboard/SideNav";
import ContestDashboard from "@/components/dashboard/ViewContests/ContestDashboard";
import React from "react";

const Page = () => {

  return (
    <SideNavLayout>
      <ContestDashboard />
    </SideNavLayout>
  );
};

export default Page;
import { ContestFormProvider } from "@/components/dashboard/newContest/ContestFormContext";
import SideNavLayout from "@/components/dashboard/SideNav";
import ContestDetailPage from "@/components/dashboard/ViewContests/ContestDetails";
import React from "react";

export default function Page() {
  return (
    <SideNavLayout>
      <ContestFormProvider>
        <ContestDetailPage contestId={""} />
      </ContestFormProvider>
    </SideNavLayout>
  );
}
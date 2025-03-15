import { ContestFormProvider } from "@/components/dashboard/newContest/ContestFormContext";
import SideNavLayout from "@/components/dashboard/SideNav";
import ContestDetailPage from "@/components/dashboard/ViewContests/ContestDetails";
import React from "react";

export default function Page({ params }: { params: { contestId: string } }) {
  return (
    <SideNavLayout>
      <ContestFormProvider>
        <ContestDetailPage contestId={params.contestId} />
      </ContestFormProvider>
    </SideNavLayout>
  );
}
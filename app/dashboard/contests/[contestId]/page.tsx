
import { ContestFormProvider } from "@/components/dashboard/newContest/ContestFormContext";
import SideNavLayout from "@/components/dashboard/SideNav";
import ContestDetailPage from "@/components/dashboard/ViewContests/ContestDetails";
import React from "react";

interface PageProps {
  params: {
    contestId: string;
  }
}

export default function Page({ params }: PageProps) {
  // Extract the contestId from params
  const { contestId } = params;
  
  return (
    <SideNavLayout>
      <ContestFormProvider>
        <ContestDetailPage contestId={contestId} />
      </ContestFormProvider>
    </SideNavLayout>
  );
}
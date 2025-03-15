// app/dashboard/contests/[contestId]/page.tsx

import { ContestFormProvider } from "@/components/dashboard/newContest/ContestFormContext";
import SideNavLayout from "@/components/dashboard/SideNav";
import ContestDetailPage from "@/components/dashboard/ViewContests/ContestDetails";
import React from "react";

interface PageParams {
  contestId: string;
}

export default function Page({ params }: { params: PageParams }) {
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

// This is required to tell Next.js this is a valid page component
Page.displayName = "ContestPage";
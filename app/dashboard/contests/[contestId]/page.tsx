"use client";

import { ContestFormProvider } from "@/components/dashboard/newContest/ContestFormContext";
import SideNavLayout from "@/components/dashboard/SideNav";
import ContestDetailPage from "@/components/dashboard/ViewContests/ContestDetails";
import React from "react";

interface ContestPageProps {
  contestId: string;
}

export default function ContestPage({ contestId }: ContestPageProps) {
  return (
    <SideNavLayout>
      <ContestFormProvider>
        <ContestDetailPage contestId={contestId} />
      </ContestFormProvider>
    </SideNavLayout>
  );
}
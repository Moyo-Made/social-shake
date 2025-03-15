import { ContestFormProvider } from "@/components/dashboard/newContest/ContestFormContext";
import SideNavLayout from "@/components/dashboard/SideNav";
import ContestDetailPage from "@/components/dashboard/ViewContests/ContestDetails";
import { Metadata } from "next";
import React from "react";

// Define props for the page component
type Props = {
  params: { contestId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// Generate metadata for the page (required for App Router pages)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Contest ${params.contestId}`,
  };
}

// Use async function for the page component to match Next.js App Router expectations
export default async function Page({ params }: Props) {
  return (
    <SideNavLayout>
      <ContestFormProvider>
        <ContestDetailPage contestId={params.contestId} />
      </ContestFormProvider>
    </SideNavLayout>
  );
}
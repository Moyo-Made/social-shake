import SideNavLayout from "@/components/brandProfile/dashboard/SideNav";
import React from "react";
import TicketDetailWrapper from "./TicketDetailsWrapper";


// This is the correct type for App Router pages with dynamic parameters
interface PageProps {
  params: {
    id: string;
  };
  searchParams: Record<string, string | string[] | undefined>;
}

export default function Page({ params }: PageProps) {
  return (
    <SideNavLayout>
      <div className="w-full p-6">
        <TicketDetailWrapper id={params.id} />
      </div>
    </SideNavLayout>
  );
}
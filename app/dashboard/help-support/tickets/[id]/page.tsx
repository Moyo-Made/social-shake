import SideNavLayout from "@/components/brandProfile/dashboard/SideNav";
import React from "react";
import TicketDetailWrapper from "./TicketDetailsWrapper";

export default function Page({
  params,
}: {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return (
    <SideNavLayout>
      <div className="w-full p-6">
        <TicketDetailWrapper id={params.id} />
      </div>
    </SideNavLayout>
  );
}
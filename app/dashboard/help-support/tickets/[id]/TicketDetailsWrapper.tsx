// app/dashboard/help-support/tickets/[id]/TicketDetailWrapper.tsx
"use client";

import TicketDetail from "@/components/help-and-support/TicketDetails";
import React from "react";

export default function TicketDetailWrapper({ id }: { id: string }) {
  return <TicketDetail params={{ id }} />;
}
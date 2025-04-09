"use client";

import { useParams } from "next/navigation";
import TicketDetail from "@/components/help-and-support/TicketDetails";
import React from "react";

export default function TicketDetailContainer() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  
  return <TicketDetail ticketId={id} />;
}
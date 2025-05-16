"use client";

import Leaderboard from "@/components/brand/brandProfile/dashboard/ViewContests/Leaderboard";
import { useParams } from "next/navigation";
import React from "react";

const ContestDetailPage = () => {
  // Extract the contestId from URL parameters
  const params = useParams();
  const contestId = params.contestId as string;

  return <Leaderboard contestId={contestId} />;
};

export default ContestDetailPage;
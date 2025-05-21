"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import CreatorLeaderboard from "@/components/Creators/dashboard/CreatorLeaderboard";

export default function ContestLeaderboardPage({ 
  params 
}: { 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any;
}) {
  // Extract contestId directly from params
  const { contestId } = params;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button and Header Section */}
      <div className="mb-6">
        <Link
          href={`/creator/dashboard/contest/${contestId}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Contest Details
        </Link>
      </div>
      
      {/* Use the contestId from the resolved parameters */}
      <CreatorLeaderboard contestId={contestId} />
    </div>
  );
}
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Contest } from "@/types/contests";

// Brand profile interface
interface BrandProfile {
  id?: string;
  userId: string;
  email?: string;
  brandName: string;
  logoUrl: string;
}

interface ContestGridCardProps {
  contest: Contest;
}

export default function ContestGridCard({ contest }: ContestGridCardProps) {
  // Add state for brand profile
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);

  // Add useEffect to fetch brand profile
  useEffect(() => {
    const fetchBrandProfile = async () => {
      if (!contest || !contest.userId) return;

      try {
        // Skip if we already have this brand profile
        if (brandProfile && brandProfile.userId === contest.userId) {
          return;
        }

        // Fetch from API
        const response = await fetch(
          `/api/admin/brand-approval?userId=${contest.userId}`
        );

        if (response.ok) {
          const data = await response.json();
          setBrandProfile(data);
        } else {
          // Handle 404 or other errors by setting a placeholder
          setBrandProfile({
            id: contest.userId,
            userId: contest.userId,
            email: "Unknown",
            brandName: "Unknown Brand",
            logoUrl: "",
          });
        }
      } catch (error) {
        console.error(
          `Error fetching brand profile for userId ${contest.userId}:`,
          error
        );
      }
    };

    if (contest) {
      fetchBrandProfile();
    }
  }, [contest, brandProfile]);

  // Helper function to get status details
  const getStatusTag = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return {
          icon: "✓",
          label: "Completed",
          className: "bg-green-50 text-green-700 border border-green-200",
        };
      case "joined":
        return {
          icon: "•",
          label: "Ongoing",
          className: "bg-[#FFF0C3] text-[#1A1A1A] border border-[#FDD849]",
        };
      default:
        return {
          icon: "•",
          label: status || "Unknown",
          className: "bg-gray-50 text-gray-700 border border-gray-200",
        };
    }
  };

  // Determine contest type text
  const getContestTypeText = (contestType: string) => {
    if (contestType?.toLowerCase().includes("leaderboard")) {
      return "Leaderboard Contest";
    } else if (contestType?.toLowerCase().includes("gmv")) {
      return "GMV Sales";
    }
    return contestType || "Contest";
  };

  // Get metrics based on contest type
  const renderMetrics = () => {
    // Use the metrics from the API if available
    const views = contest?.views || 0;
    
    if (contest.contestType?.toLowerCase().includes("gmv")) {
      return (
        <>
          <div className="p-3 bg-[#FFF4EE] rounded-lg text-center">
            <div className="text-gray-600">GMV Sales</div>
            <div className="text-xl font-medium">${contest?.gmvSales || 0}</div>
          </div>
          <div className="p-4 bg-[#FFF4EE] rounded-lg text-center">
            <div className="text-gray-600">Views</div>
            <div className="text-xl font-medium">{views.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-[#FFF4EE] rounded-lg text-center">
            <div className="text-gray-600">Comments</div>
            <div className="text-xl font-medium">{contest.comments || 0}</div>
          </div>
        </>
      );
    } else {
      return (
        <>
          <div className="p-4 bg-[#FFF4EE] rounded-lg text-center">
            <div className="text-gray-600">Views</div>
            <div className="text-xl font-medium">{views.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-[#FFF4EE] rounded-lg text-center">
            <div className="text-gray-600">Likes</div>
            <div className="text-xl font-medium">{contest.likes || 0}</div>
          </div>
          <div className="p-4 bg-[#FFF4EE] rounded-lg text-center">
            <div className="text-gray-600">Comments</div>
            <div className="text-xl font-medium">{contest.comments || 0}</div>
          </div>
        </>
      );
    }
  };

  const { icon, label, className } = getStatusTag(contest.status);

  return (
    <div className="border border-[#6670854D] rounded-lg bg-white p-6 ">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-medium">{contest.basic?.contestName || ""}</h3>
        <span className={`rounded-full px-2 py-1 text-sm flex items-center ${className}`}>
          <span className="mr-1">{icon}</span> {label}
        </span>
      </div>

      <div className="flex items-center mb-6">
        <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
          <Image
            src={brandProfile?.logoUrl || "/api/placeholder/40/40"}
            alt={brandProfile?.brandName || "Brand logo"}
            width={20}
            height={20}
            className="object-cover w-full h-full"
          />
        </div>
        <span className="text-sm font-medium">{brandProfile?.brandName || ""}</span>
        <span className="ml-auto text-sm text-gray-500">{getContestTypeText(contest.contestType || "")}</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {renderMetrics()}
      </div>

      <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg mt-6 transition-colors">
        View Leaderboard
      </button>
    </div>
  );
}
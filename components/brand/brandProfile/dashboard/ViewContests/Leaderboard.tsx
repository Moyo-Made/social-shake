"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import CountdownTimer from "./CountdownTimer";
import { Creator } from "@/types/creators";
import Link from "next/link";

interface LeaderboardProps {
  contestId: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ contestId }) => {
  const [approvedCreators, setApprovedCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contestData, setContestData] = useState(null);

// Add to your existing useEffect or create a new one
useEffect(() => {
  const fetchContestData = async () => {
    if (!contestId) return;
    
    try {
      const response = await fetch(`/api/contests?contestId=${contestId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch contest data");
      }
      
      const data = await response.json();
      setContestData(data.data);
    } catch (err) {
      console.error("Error fetching contest data:", err);
    }
  };
  
  fetchContestData();
}, [contestId]);

  useEffect(() => {
    const fetchApprovedApplications = async () => {
      if (!contestId) return;

      try {
        setLoading(true);
        // Fetch applications for the contest
        const response = await fetch(`/api/contest-applications?contestId=${contestId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch applications");
        }

        const data = await response.json();
        
        // Filter only approved applications
        const approvedApplications = data.filter((app: { status: string; }) => app.status.toLowerCase() === "approved");
        
        // If there are no approved applications, set empty array and stop loading
        if (approvedApplications.length === 0) {
          setApprovedCreators([]);
          setLoading(false);
          return;
        }

        // Fetch creator data for each approved application
        const creatorDataArray = await Promise.all(
          approvedApplications.map(async (app: {
			  postUrl: string; userId: string 
}) => {
            try {
              const creatorRes = await fetch(`/api/admin/creator-approval?userId=${app.userId}`);
              
              if (creatorRes.ok) {
                const response = await creatorRes.json();
                
                if (response.creators && response.creators.length > 0) {
                  const creator = response.creators[0];
                  
                  // Combine application data with creator data
                  return {
                    ...app,
                    creator: creator,
                    metrics: {
                      // Get metrics from TikTok data
                      views: creator.tiktokMetrics?.views || 
                             creator.creatorProfileData?.tiktokMetrics?.views || 
                             creator.tiktokData?.tiktokAverageViews || 0,
                      likes: creator.tiktokMetrics?.likes || 
                             creator.creatorProfileData?.tiktokMetrics?.likes || 0,
                      comments: creator.tiktokMetrics?.comments || 
                                creator.creatorProfileData?.tiktokMetrics?.comments || 0,
                      followers: creator.tiktokMetrics?.followers?.count || 
                                creator.creatorProfileData?.tiktokMetrics?.followers?.count || 
                                creator.tiktokData?.tiktokFollowers || 0
                    },
                    position: 0, // Will be calculated later
                    profileImage: creator.creatorProfileData?.tiktokAvatarUrl || 
                                 creator.logoUrl || 
                                 "/icons/default-avatar.svg",
                    username: creator.creatorProfileData?.tiktokUsername  || creator.username || "Unknown",
                    fullName: `${creator.firstName || ""} ${creator.lastName || ""}`.trim() || 
                             creator.creatorProfileData?.tiktokDisplayName || 
                              "Unknown Creator",
							  tiktokLink: app.postUrl || creator.socialMedia?.tiktok || 
							  creator.creatorProfileData?.tiktokProfileLink || 
							  "#"
                  };
                }
              }
              return null;
            } catch (err) {
              console.error(`Error fetching creator data for user ID ${app.userId}:`, err);
              return null;
            }
          })
        );

        // Filter out null values and sort by views (you can change the sorting criteria)
        const validCreators = creatorDataArray
          .filter(creator => creator !== null)
          .sort((a, b) => b.metrics.views - a.metrics.views);
        
        // Assign positions based on sorting
        const creatorsWithPositions = validCreators.map((creator, index) => ({
          ...creator,
          position: index + 1
        }));

        setApprovedCreators(creatorsWithPositions);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        console.error("Error fetching approved applications:", err);
        setLoading(false);
      }
    };

    fetchApprovedApplications();
  }, [contestId]);

  // Badge colors and backgrounds for top positions
  const positionStyles = {
    1: { cardBg: "#FBED7B", borderColor: "#FCD949", badge: "/icons/Gold.svg" },
    2: { cardBg: "#EBF1F5", borderColor: "#B0C1D1", badge: "/icons/Silver.svg" },
    3: { cardBg: "#F7E6D8", borderColor: "#CF9C69", badge: "/icons/Bronze.svg" },
  };

  // Format numbers to be more readable
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };


  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto text-center py-16">
        <p>Loading creator leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto text-center text-red-500 py-16">
        <p>Error loading leaderboard: {error}</p>
      </div>
    );
  }

  if (approvedCreators.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto text-center py-16">
        <p>No approved creators found for this contest yet.</p>
      </div>
    );
  }

  // Get top 3 creators for featured display
  const topContestants = approvedCreators.slice(0, 3);
  
  // Get the rest for the table
  const leaderboardData = approvedCreators;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {contestData && <CountdownTimer contest={contestData} />}
      
      {/* Top 3 Cards Section */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {topContestants.map((contestant: { position: 1 | 2 | 3; [key: string]: any }) => (
          <div
            key={contestant.id}
            className="w-72 border rounded-lg overflow-hidden"
            style={{
              borderColor: positionStyles[contestant.position].borderColor,
            }}
          >
            {/* Profile Image Section */}
            <div className="h-20 flex justify-center py-4 bg-white">
              <div className="relative h-20">
                <Image
                  src={contestant.profileImage}
                  alt={contestant.fullName}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover"
                />
                <div className="absolute -bottom-1 right-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-black border-2 border-white">
                  <Image
                    src={positionStyles[contestant.position].badge}
                    alt={`Position ${contestant.position}`}
                    width={30}
                    height={30}
                  />
                </div>
              </div>
            </div>

            {/* Details Section */}
            <div
              className="pt-3"
              style={{
                backgroundColor: positionStyles[contestant.position].cardBg,
              }}
            >
              <div className="pt-3 pb-1 text-center">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="font-bold text-[#101828] text-lg">
                    {contestant.fullName}
                  </h3>
                  <Image src="/icons/message.svg" alt="Message" width={20} height={20} />
                </div>
                <p className="text-sm text-[#667085]">@{contestant.username}</p>
              </div>

              <div className="flex justify-between px-4 py-2 text-center">
                <div className="flex-1">
                  <p className="text-sm text-[#667085]">Views</p>
                  <p className="font-semibold text-[#101828]">
                    {formatNumber(contestant.metrics.views)}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#667085]">Likes</p>
                  <p className="font-semibold text-[#101828]">
                    {formatNumber(contestant.metrics.likes)}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#667085]">Comments</p>
                  <p className="font-semibold text-[#101828]">
                    {formatNumber(contestant.metrics.comments)}
                  </p>
                </div>
              </div>
            </div>
            <div className="py-3 text-center border-t border-gray-200 mx-4">
              <Link href={contestant.tiktokLink} className="inline-flex items-center text-sm font-medium">
                View Post <ArrowRight size={16} className="ml-2" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="flex bg-gray-50 py-3 text-gray-600 text-sm font-normal border-b border-gray-200">
        <div className="flex-1 text-center">Position</div>
        <div className="flex-1 mr-5 text-center">Creator Username</div>
        <div className="flex-1 text-center">Creator Fullname</div>
        <div className="flex-1 text-center">TikTok Link</div>
        <div className="flex-1 text-center">Views</div>
        <div className="flex-1 text-center">Likes</div>
        <div className="flex-1 text-center">Comments</div>
      </div>

      {/* Table Rows */}
      {leaderboardData.map((item) => (
        <div
          key={item.id}
          className="flex py-3 items-center border-b border-gray-200 text-sm"
        >
          <div className="flex-1 text-center font-medium">#{item.position}</div>
          <div className="flex-1 mr-5 flex justify-center items-center gap-2">
            <Image
              src={item.profileImage}
              alt={item.username || ""}
              className="w-8 h-8 rounded-full"
              width={32}
              height={32}
            />
            <span className="underline font-medium">@{item.username}</span>
          </div>
          <div className="flex-1 text-center">{item.fullName}</div>
          <div className="flex-1 text-center">
            <Link 
              href={item.tiktokLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-orange-500 font-medium hover:underline"
            >
              View Post
            </Link>
          </div>
          <div className="flex-1 text-center">{formatNumber(item.metrics.views)}</div>
          <div className="flex-1 text-center">{formatNumber(item.metrics.likes)}</div>
          <div className="flex-1 text-center">{formatNumber(item.metrics.comments)}</div>
        </div>
      ))}
    </div>
  );
};

export default Leaderboard;
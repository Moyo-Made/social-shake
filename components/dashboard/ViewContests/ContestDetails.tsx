"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useContestForm } from "../newContest/ContestFormContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import Applications from "./Applications";
import AnalyticsDashboard from "./Metrics";
import GMVMetrics from "./GMVMetrics";
import Leaderboard from "./Leaderboard";
import GMVData from "./GMVData";

// Define types for the contest data structure
interface PrizeTimeline {
  startDate?: string;
  endDate?: string;
  totalPrize?: number;
  totalBudget?: number;
  winnerCount?: number;
  positions?: number[];
  criteria?: string;
}

interface BasicInfo {
  contestName?: string;
  description?: string;
  contestType?: "Leaderboard" | "GMV";
  industry?: string;
  rules?: string;
  thumbnail?: string;
  script?: string;
}

interface Requirements {
  duration?: string;
  videoType?: string;
  contentLinks?: string | string[];
  brandAssets?: string;
  whoCanJoin?: string;
}

interface Incentive {
  name: string;
  worth: number;
  description: string;
}

interface ContestData {
  basic?: BasicInfo;
  prizeTimeline?: PrizeTimeline;
  requirements?: Requirements;
  incentives?: Incentive[] | { prizeBreakdown?: string };
  status?: string;
  createdAt?: string;
  contestType?: "leaderboard" | "gmv";
}

interface ContestDetailPageProps {
  contestId: string;
}

export default function ContestDetailPage({ contestId }: ContestDetailPageProps) {
  const [activeTab, setActiveTab] = useState<string>("contest-overview");
  const [contestData, setContestData] = useState<ContestData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { formData } = useContestForm();
  const contestType = contestData?.contestType || formData?.basic?.contestType?.toLowerCase() || "leaderboard";
  
  // Format date for display
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "Not Set";
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) 
      ? date.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })
      : "Not Set";
  };
  
  // Format status based on dates
  const getContestStatus = (data: ContestData | null): string => {
    if (!data) return "Draft";
    
    let status = data.status || "Draft";
    const now = new Date();
    const startDate = data.prizeTimeline?.startDate ? new Date(data.prizeTimeline.startDate) : null;
    const endDate = data.prizeTimeline?.endDate ? new Date(data.prizeTimeline.endDate) : null;
    
    if (status.toLowerCase() === "published" && (!startDate || !endDate)) {
      status = "Draft";
    }
    else if (status.toLowerCase() === "published" || status.toLowerCase() === "active") {
      if (startDate && endDate) {
        if (now < startDate) {
          status = "Scheduled";
        } else if (now >= startDate && now <= endDate) {
          status = "Active";
        } else if (now > endDate) {
          status = "Completed";
        }
      } else {
        status = "Draft";
      }
    }
    
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  useEffect(() => {
    const fetchContestData = async () => {
      if (!contestId) {
        setLoading(false);
        setError("Contest ID not found");
        return;
      }
      
      try {
        setLoading(true);
        const contestRef = doc(db, "contests", contestId.toString());
        const contestSnap = await getDoc(contestRef);
        
        if (contestSnap.exists()) {
          const data = contestSnap.data() as ContestData;
          setContestData(data);
        } else {
          setError("Contest not found");
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching contest data:", err);
        setError("Failed to load contest data");
        setLoading(false);
      }
    };
    
    fetchContestData();
  }, [contestId]);

  if (loading) {
    return (
      <div className="container px-5 py-6 max-w-6xl bg-white border border-[#FFD9C3] rounded-lg mx-6 my-5 flex justify-center items-center h-64">
        <p>Loading contest details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container px-5 py-6 max-w-6xl bg-white border border-[#FFD9C3] rounded-lg mx-6 my-5 flex justify-center items-center h-64">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // Extract contest details from fetched data
  const contestTitle = contestData?.basic?.contestName || "Untitled Contest";
  const contestStatus = getContestStatus(contestData);
  const startDate = formatDate(contestData?.prizeTimeline?.startDate);
  const endDate = formatDate(contestData?.prizeTimeline?.endDate);
  const totalBudget = contestData?.prizeTimeline?.totalPrize || contestData?.prizeTimeline?.totalBudget || 0;
  const publishedDate = formatDate(contestData?.createdAt);
  const description = contestData?.basic?.description || "No description provided.";
  const rules = contestData?.basic?.rules?.split('\n') || ["No rules specified."];
  const industry = contestData?.basic?.industry || "Not specified";
  const duration = contestData?.requirements?.duration || "Not specified";
  const videoType = contestData?.requirements?.videoType || "Not specified";
  const clientScript = contestData?.basic?.script?.split('\n') || ["No script provided."];
  const contentLinksRaw = contestData?.requirements?.contentLinks;
  const contentLinks = Array.isArray(contentLinksRaw) 
    ? contentLinksRaw 
    : (typeof contentLinksRaw === 'string' ? [contentLinksRaw] : ["No content links provided."]);
  const brandAssets = contestData?.requirements?.brandAssets || "No brand assets provided.";
  const whoCanJoin = contestData?.requirements?.whoCanJoin || "Not specified";
  const winnerCount = contestData?.prizeTimeline?.winnerCount || 0;
  const positions = contestData?.prizeTimeline?.positions || [];
  const criteria = contestData?.prizeTimeline?.criteria || "Not specified";
  const incentives = Array.isArray(contestData?.incentives) 
    ? contestData?.incentives 
    : [];
  
  return (
    <div className="container px-5 py-6 max-w-6xl bg-white border border-[#FFD9C3] rounded-lg mx-6 my-5 relative">
      <div className="mb-6 relative">
        <div className="flex gap-3">
          <h1 className="text-2xl font-bold">{contestTitle}</h1>
          <div className={`inline-flex items-center gap-1 px-2 py-1 mt-1 rounded-full text-xs ${
            contestStatus === "Active" 
              ? "bg-[#ABEFC6] text-[#067647]" 
              : contestStatus === "Draft"
              ? "bg-[#F6F6F6] text-[#667085]"
              : contestStatus === "Completed"
              ? "bg-[#FDD849] text-[#1A1A1A]"
              : contestStatus === "Scheduled"
              ? "bg-[#DBEAFE] text-[#3B82F6]"
              : "bg-[#FFE5FB] text-[#FC52E4]"
          }`}>
            {contestStatus === "Active" ? (
              <CheckCircle size={12} />
            ) : (
              <Clock size={12} />
            )}
            <span>{contestStatus}</span>
          </div>
        </div>
        <div className="absolute top-1 right-0 text-sm">
          <span className="text-gray-600">Published On</span>
          <p className="font-medium">{publishedDate}</p>
        </div>
      </div>

      <div className="flex gap-6 mb-6 mt-10">
        <div className="flex flex-col w-full">
          <div className="flex gap-2 mb-6">
            <div className="flex items-center gap-1">
              <span className="text-base text-[#FD5C02]">Start Date:</span>
              <p className="text-base">{startDate}</p>
            </div>
            <div className="border-l pl-4 flex items-center gap-1">
              <span className="text-base text-[#FD5C02]">End Date:</span>
              <p className="text-base">{endDate}</p>
            </div>
            <div className="border-l pl-4 flex items-center gap-1">
              <span className="text-base text-[#FD5C02]">Total Budget:</span>
              <p className="text-base">${totalBudget}</p>
            </div>
          </div>

          <Tabs
            defaultValue="contest-overview"
            className=""
            onValueChange={(value) => setActiveTab(value)}
          >
            <TabsList className="grid grid-cols-4 mb-8 bg-transparent p-0 gap-0 w-[85%] ">
              <TabsTrigger
                value="contest-overview"
                className="data-[state=active]:bg-[#FFF4EE] data-[state=active]:border-b-2 data-[state=active]:border-[#FC52E4] data-[state=active]:text-[#FD5C02] data-[state=inactive]:text-[#667085] rounded-none py-3"
              >
                Contest Overview
              </TabsTrigger>
              <TabsTrigger
                value="applications"
                className="data-[state=active]:bg-[#FFF4EE] data-[state=active]:border-b-2 data-[state=active]:border-[#FC52E4] data-[state=active]:text-[#FD5C02] data-[state=inactive]:text-[#667085] rounded-none py-3"
              >
                Applications
              </TabsTrigger>
              <TabsTrigger
                value="available-metrics"
                className="data-[state=active]:bg-[#FFF4EE] data-[state=active]:border-b-2 data-[state=active]:border-[#FC52E4] data-[state=active]:text-[#FD5C02] data-[state=inactive]:text-[#667085] rounded-none py-3"
              >
                Available Metrics
              </TabsTrigger>
              <TabsTrigger
                value="leaderboard"
                className="data-[state=active]:bg-[#FFF4EE] data-[state=active]:border-b-2 data-[state=active]:border-[#FC52E4] data-[state=active]:text-[#FD5C02] data-[state=inactive]:text-[#667085] rounded-none py-3"
              >
                {contestType === "Leaderboard" ? "Leaderboard" : "GMV Data"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contest-overview" className="w-full space-y-6">
              {/* Basic Information Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
                <h3 className="text-base text-[#667085] mb-2">Contest Type</h3>
                <p className="capitalize">{contestType}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
                <h3 className="text-base text-[#667085] mb-2">Contest Description</h3>
                <p>{description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
                <h3 className="text-base text-[#667085] mb-2">Contest Rules</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {rules.map((rule, index) => (
                    <li key={index} className="text-base">{rule}</li>
                  ))}
                </ul>
              </div>

              {/* Contest Requirements Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
                <h3 className="text-base text-[#667085] mb-2">Who Can Join</h3>
                <p className="capitalize">
                  {whoCanJoin.replace(/-/g, ' ')}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
                <h3 className="text-base text-[#667085] mb-2">Contest Industry</h3>
                <p>{industry}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
                <h3 className="text-base text-[#667085] mb-2">Duration</h3>
                <p className="capitalize">{duration.replace(/-/g, ' ')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
                <h3 className="text-base text-[#667085] mb-2">Video Type</h3>
                <p className="capitalize">{videoType.replace(/-/g, ' ')}</p>
              </div>

              {/* Contest Type Specific Criteria */}
              <div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
                <h3 className="text-base text-[#667085] mb-2">
                  {contestType === "leaderboard" ? "Ranking Criteria" : "GMV Criteria"}
                </h3>
                <p className="capitalize">{criteria.replace(/-/g, ' ')}</p>
              </div>

              {/* Prize Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
                <h3 className="text-base text-[#667085] mb-2">Prize Distribution</h3>
                <div>
                  <p className="mb-2">Winner Count: {winnerCount}</p>
                  {positions.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1">
                      {positions.map((prize, index) => (
                        <li key={index} className="text-base">
                          Position {index + 1}: ${prize}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Additional Incentives */}
              {incentives.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
                  <h3 className="text-base text-[#667085] mb-2">Additional Incentives</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {incentives.map((incentive, index) => (
                      <li key={index} className="text-base">
                        {incentive.name}: ${incentive.worth} - {incentive.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Content Creation Guidance */}
              <div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
                <h3 className="text-base text-[#667085] mb-2">Client&apos;s Script</h3>
                <div className="space-y-2">
                  {clientScript.map((line, index) => (
                    <p key={index} className="text-base">{line}</p>
                  ))}
                </div>
              </div>

              {contentLinks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 border-b pb-4">
                  <h3 className="text-base text-[#667085] mb-2">Links of Content you like</h3>
                  <div className="space-y-2">
                    {contentLinks.map((link, index) => (
                      <Link
                        key={index}
                        href={link}
                        className="text-[#FD5C02] hover:underline"
                      >
                        <p className="text-base">{link}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2">
                <h3 className="text-base text-[#667085] mb-2">Brand Assets</h3>
                <Link
                  href={brandAssets}
                  className="text-[#FD5C02] hover:underline"
                >
                  <p className="text-base">{brandAssets}</p>
                </Link>
              </div>
            </TabsContent>

            <TabsContent value="applications" className="w-full">
              <Applications />
            </TabsContent>

            {/* Dynamic Metrics Tab */}
            <TabsContent value="available-metrics">
              {contestType === "leaderboard" ? (
                <AnalyticsDashboard />
              ) : (
                <GMVMetrics />
              )}
            </TabsContent>

            {/* Dynamic Leaderboard Tab */}
            <TabsContent value="leaderboard">
              {contestType === "leaderboard" ? (
                <Leaderboard />
              ) : (
                <GMVData />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column with fixed width */}
        <div className="relative">
          {/* Position the Message Participants button */}
          <div className="absolute top-0 right-0">
            <Link href="/dashboard/messages">
              <Button className="bg-[#FD5C02] text-white text-base px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
                Message Participants
              </Button>
            </Link>
          </div>
          
          {activeTab === "contest-overview" && (
            <Card className="bg-[#1A1A1A] text-white py-3 w-56 h-auto min-h-36 flex flex-col items-center justify-start mt-20">
              <h3 className="text-lg font-medium text-center mb-2">
                Prize Breakdown
              </h3>
              
              {/* Display prize positions */}
              {positions.length > 0 && (
                <div className="px-4 w-full">
                  <ul className="space-y-2 text-sm">
                    {positions.map((prize, index) => (
                      <li key={index} className="flex justify-between items-center">
                        <span>Position {index + 1}</span>
                        <span className="font-medium">${prize}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
                    <span>Total</span>
                    <span className="font-medium">${totalBudget}</span>
                  </div>
                </div>
              )}
              
              {/* Display text-based prize breakdown if available */}
              {!Array.isArray(contestData?.incentives) && contestData?.incentives?.prizeBreakdown && (
                <div className="px-4 mt-2 text-sm">
                  {contestData.incentives.prizeBreakdown}
                </div>
              )}
            </Card>
          )}
        </div> 
      </div>
    </div>
  );
}
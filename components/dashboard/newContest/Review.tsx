"use client";

import React from "react";
import Image from "next/image";
import { Edit } from "lucide-react";

// Define types
interface PrizeBreakdown {
  position: string;
  amount: number;
}

interface ContestData {
  // Basic info
  title: string;
  description: string;
  industry: string;
  thumbnailUrl: string;
  
  // Requirements
  duration: string;
  videoType: string;
  clientScript: string;
  brandAssets: string;
  
  // Prizes & Timeline
  totalBudget: number;
  winnerCount: number;
  prizeBreakdown: PrizeBreakdown[];
  startDate: string;
  endDate: string;
  leaderboardCriteria: string;
}

interface ContestDisplayProps {
  contestData?: ContestData;
}

const Review: React.FC<ContestDisplayProps> = ({ contestData }) => {
  // If no data is provided, use sample data
  const data: ContestData = contestData || {
    // Basic info
    title: "Best TikTok Ad for XYZ Shoes",
    description: "We're looking for an energetic and engaging TikTok ad for XYZ Shoes. Highlight comfort and style, and encourage users to try them out!",
    industry: "Skincare",
    thumbnailUrl: "/placeholder-thumbnail.jpg",
    
    // Requirements
    duration: "30 Seconds",
    videoType: "Client's Script",
    clientScript: "[On-screen text: \"#XYZAdChallenge — Try them now!\"]",
    brandAssets: "https://drive.google.com/file/d/1l31B5fb21SJf5P9LWNKW-pAF7kN7knTX/view?usp=sharing",
    
    // Prizes & Timeline
    totalBudget: 1500,
    winnerCount: 5,
    prizeBreakdown: [
      { position: "1st Position", amount: 1000 },
      { position: "2nd Position", amount: 300 },
      { position: "3rd Position", amount: 100 },
      { position: "4th Position", amount: 50 },
      { position: "5th Position", amount: 50 }
    ],
    startDate: "March 6, 2025",
    endDate: "March 30, 2025",
    leaderboardCriteria: "Views"
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto border border-[#FFBF9B] rounded-xl p-6">
      {/* Contest Basics Section */}
      <div className="">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Contest Basics</h2>
          <button className="text-gray-500">
            <Edit className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium text-gray-600">Contest Title:</div>
            <div className="col-span-2">{data.title}</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium text-gray-600">Contest Description</div>
            <div className="col-span-2">{data.description}</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium text-gray-600">Contest Industry:</div>
            <div className="col-span-2">{data.industry}</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium text-gray-600">Contest Thumbnail</div>
            <div className="col-span-2">
              <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                <Image 
                  src="/api/placeholder/400/320" 
                  alt="Contest thumbnail" 
                  width={400}
                  height={200}
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contest Requirements Section */}
      <div className="">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Contest Requirements</h2>
          <button className="text-gray-500">
            <Edit className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium text-gray-600">Duration:</div>
            <div className="col-span-2">{data.duration}</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium text-gray-600">Video Type</div>
            <div className="col-span-2">{data.videoType}</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium text-gray-600">Client's Script</div>
            <div className="col-span-2 bg-gray-100 p-3 rounded-lg flex items-center">
             
              {data.clientScript}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium text-gray-600">Brand Assets</div>
            <div className="col-span-2">
              <a href={data.brandAssets} className="text-orange-500 truncate block hover:underline">
                {data.brandAssets}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Prizes & Timeline Section */}
      <div className="">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Prizes & Timeline</h2>
          <button className="text-gray-500">
            <Edit className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium text-gray-600">Total Budget & Prize Pool</div>
            <div className="col-span-2">${data.totalBudget.toLocaleString()}</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium text-gray-600">Number of Winners</div>
            <div className="col-span-2">{data.winnerCount} Winners</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium text-gray-600">Prize Breakdown</div>
            <div className="col-span-2 space-y-1">
              {data.prizeBreakdown.map((prize, index) => (
                <div key={index}>{prize.position}: ${prize.amount}</div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium text-gray-600">Contest Start Date</div>
            <div className="col-span-2">{data.startDate}</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium text-gray-600">Contest End Date</div>
            <div className="col-span-2">{data.endDate}</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="font-medium text-gray-600">Leaderboard Criteria</div>
            <div className="col-span-2">{data.leaderboardCriteria}</div>
          </div>
        </div>
      </div>
    
    </div>
  );
};

export default Review;
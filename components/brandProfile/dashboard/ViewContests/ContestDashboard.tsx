"use client";

import { useState, useCallback, useEffect, SetStateAction } from "react";
import { Search } from "lucide-react";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { auth, db } from "@/config/firebase";

interface Contest {
  id: string;
  status: string;
  title: string;
  totalBudget: number;
  startDate: string;
  endDate: string;
  rankingMethod: string;
  contestType: string;
  contestants: number;
  thumbnailUrl: string;
  metrics: {
    views: number;
    likes: number;
    comments: number;
  };
  rawData: {
    basic?: {
      contestName?: string;
      thumbnail?: string;
    };
    prizeTimeline?: {
      startDate?: string;
      endDate?: string;
      totalPrize?: number;
      totalBudget?: number;
      criteria?: string;
    };
    contestType?: string;
    participants?: number;
    metrics?: {
      views?: number;
      likes?: number;
      comments?: number;
    };
    [key: string]: unknown;
  };
}

const ContestDashboard = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [budgetFilter, setBudgetFilter] = useState<string | null>(null);
  const [rankingFilter, setRankingFilter] = useState<string | null>(null);
  const [filteredContests, setFilteredContests] = useState<Contest[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Set up auth state listener to get current user ID instead of email
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.uid) {
        setCurrentUserId(user.uid);
      } else {
        setCurrentUserId(null);
        setContests([]);
        setFilteredContests([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch contests from Firebase when user ID changes
  useEffect(() => {
    if (!currentUserId) {
      // If no user is logged in or ID isn't available, don't fetch
      setContests([]);
      setFilteredContests([]);
      setLoading(false);
      return;
    }

    const fetchContests = async () => {
      try {
        setLoading(true);
        console.log("Fetching contests for user ID:", currentUserId);

        // Create a reference to the contests collection
        const contestsRef = collection(db, "contests");

        // Create a query filtered by the current user's ID instead of email
        const contestsQuery = query(
          contestsRef,
          where("userId", "==", currentUserId),
          orderBy("createdAt", "desc")
        );

        const querySnapshot = await getDocs(contestsQuery);
        console.log(`Found ${querySnapshot.size} contests for this user`);

        // Format the data to match our component's expected structure
        const contestsData = querySnapshot.docs.map((doc) => {
          const data = doc.data();

          // Determine status based on dates and status field
          let status = data.status || "Draft";
          const now = new Date();
          const startDate = data.prizeTimeline?.startDate
            ? new Date(data.prizeTimeline.startDate)
            : null;
          const endDate = data.prizeTimeline?.endDate
            ? new Date(data.prizeTimeline.endDate)
            : null;

          // If the contest was just published/created but dates aren't set
          if (
            status.toLowerCase() === "published" &&
            (!startDate || !endDate)
          ) {
            status = "Draft"; // Mark as draft if dates aren't set
          }
          // Override status based on dates if status is "published" or "active"
          else if (
            status.toLowerCase() === "published" ||
            status.toLowerCase() === "active"
          ) {
            if (startDate && endDate) {
              if (now < startDate) {
                status = "Scheduled";
              } else if (now >= startDate && now <= endDate) {
                status = "Active";
              } else if (now > endDate) {
                status = "Completed";
              }
            } else {
              status = "Draft"; // Mark as draft if dates aren't properly set
            }
          }

          // Format dates for display
          const formatDate = (dateString: string | number | Date) => {
            if (!dateString) return "Not Set";
            const date = new Date(dateString);
            return date instanceof Date && !isNaN(date.getTime())
              ? date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Not Set";
          };

          // Extract total budget from prizeTimeline
          const totalBudget =
            data.prizeTimeline?.totalPrize ||
            data.prizeTimeline?.totalBudget ||
            0;

          // Get thumbnail URL from the basic section
          const thumbnailUrl = data.basic?.thumbnail || '/images/contest-thumbnail.png';

          return {
            id: doc.id,
            status: status.charAt(0).toUpperCase() + status.slice(1), // Capitalize status
            title: data.basic?.contestName || "Untitled Contest",
            totalBudget: totalBudget,
            startDate: formatDate(data.prizeTimeline?.startDate),
            endDate: formatDate(data.prizeTimeline?.endDate),
            rankingMethod: data.prizeTimeline?.criteria || "Not Set",
            contestType: data.contestType || "Leaderboard",
            contestants: data.participants || 0,
            thumbnailUrl: thumbnailUrl,
            // Initialize with empty metrics if not available yet
            metrics: {
              views: data.metrics?.views || 0,
              likes: data.metrics?.likes || 0,
              comments: data.metrics?.comments || 0,
            },
            // Store the raw data for any additional needs
            rawData: data,
          };
        });

        setContests(contestsData);
        setFilteredContests(contestsData);
        setLoading(false);
      } catch (err: unknown) {
        console.error("Error fetching contests:", err);
        setError(`Failed to load contests: ${(err as Error).message}`);
        setLoading(false);
      }
    };

    fetchContests();
  }, [currentUserId]);

  // Apply filters whenever filter states change
  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, budgetFilter, rankingFilter, contests]);

  const applyFilters = useCallback(() => {
    let result = [...contests];

    // Apply search filter
    if (searchTerm) {
      result = result.filter((contest) =>
        contest.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter) {
      result = result.filter((contest) => contest.status === statusFilter);
    }

    // Apply budget filter
    if (budgetFilter) {
      result = result.filter((contest) => {
        const budget = contest.totalBudget;
        if (budgetFilter === "low") return budget < 1000;
        if (budgetFilter === "medium") return budget >= 1000 && budget <= 5000;
        if (budgetFilter === "high") return budget > 5000;
        return true;
      });
    }

    // Apply ranking filter
    if (rankingFilter) {
      result = result.filter((contest) => {
        // Handle "Not Set" case
        if (contest.rankingMethod === "Not Set") return false;

        // Match exact ranking method or check if it contains the filter term
        return (
          contest.rankingMethod === rankingFilter ||
          contest.rankingMethod.includes(rankingFilter)
        );
      });
    }

    setFilteredContests(result);
  }, [contests, searchTerm, statusFilter, budgetFilter, rankingFilter]);

  // Handle search input change
  const handleSearch = (e: { target: { value: SetStateAction<string> } }) => {
    setSearchTerm(e.target.value);
  };

  // Modify onValueChange for each filter
  const handleStatusFilterChange = (value: SetStateAction<string | null>) => {
    setStatusFilter(value === "all-status" ? null : value);
  };

  const handleBudgetFilterChange = (value: SetStateAction<string | null>) => {
    setBudgetFilter(value === "all-budget" ? null : value);
  };

  const handleRankingFilterChange = (value: SetStateAction<string | null>) => {
    setRankingFilter(value === "all-ranking" ? null : value);
  };

  // Helper function to handle image loading errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.src = "/images/contest-thumbnail.png";
  };
  
  // Function to handle contest click
  const handleContestClick = (contest: Contest, e: React.MouseEvent) => {
    if (contest.status === "Draft") {
      e.preventDefault();
      router.push(`/dashboard/contests/edit/${contest.id}`);
    }
  };

  return (
    <div className="bg-orange-50 p-4 min-h-screen w-full">
      {/* Header with search and filters */}
      <div className="flex justify-between mb-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search Contests"
            className="pl-3 pr-10 py-2 rounded-md border border-[#D0D5DD] bg-white focus:outline-gray-400"
            value={searchTerm}
            onChange={handleSearch}
          />
          <Search className="absolute right-3 top-3 text-gray-400 h-4 w-4" />
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Select
              value={statusFilter || ""}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger className="w-full bg-white md:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="md:w-32 px-1 bg-white z-50">
                <SelectItem value="all-status">All</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Reviewing">Reviewing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Select
              value={budgetFilter || ""}
              onValueChange={handleBudgetFilterChange}
            >
              <SelectTrigger className="w-full bg-white md:w-40">
                <SelectValue placeholder="Total Budget" />
              </SelectTrigger>
              <SelectContent className="md:w-40 px-1 bg-white z-50">
                <SelectItem value="all-budget">All</SelectItem>
                <SelectItem value="low">Under $1,000</SelectItem>
                <SelectItem value="medium">$1,000 - $5,000</SelectItem>
                <SelectItem value="high">Over $5,000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Select
              value={rankingFilter || ""}
              onValueChange={handleRankingFilterChange}
            >
              <SelectTrigger className="w-full bg-white md:w-40">
                <SelectValue placeholder="Ranking Method" />
              </SelectTrigger>
              <SelectContent className="md:w-40 px-1 bg-white z-50">
                <SelectItem value="all-ranking">All</SelectItem>
                <SelectItem value="views">Views</SelectItem>
                <SelectItem value="likes">Likes</SelectItem>
                <SelectItem value="engagement">Engagement</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="bg-orange-500 text-white px-4 py-1 rounded-md flex items-center">
            <Link href="/dashboard/contests/new">Create New Contest</Link>
            <span className="ml-1 text-lg">+</span>
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="col-span-2 text-center py-8 rounded-lg">
          <p className="text-gray-500">Loading contests...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="col-span-2 text-center py-8 rounded-lg">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Contest grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContests.length > 0 ? (
            filteredContests.map((contest) => (
              <div key={contest.id}>
                {contest.status === "Draft" ? (
                  <div 
                    className="cursor-pointer"
                    onClick={(e) => handleContestClick(contest, e as React.MouseEvent)}
                  >
                    <div
                      className="rounded-lg p-4 bg-white border border-[#667085]"
                    >
                      <ContestCard contest={contest} handleImageError={handleImageError} />
                    </div>
                  </div>
                ) : (
                  <Link key={contest.id} href={`/dashboard/contests/${contest.id}`}>
                    <div
                      className={`rounded-lg p-4 ${
                        contest.status === "Active"
                          ? "bg-white border border-[#067647]"
                          : contest.status === "Completed"
                          ? "bg-white border border-[#FDD849]"
                          : contest.status === "Scheduled"
                          ? "bg-white border border-[#3B82F6]"
                          : "bg-white border border-[#FC52E4]"
                      }`}
                    >
                      <ContestCard contest={contest} handleImageError={handleImageError} />
                    </div>
                  </Link>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-8 rounded-lg">
              <p className="text-gray-500">
                {currentUserId 
                  ? "No contests found. Create your first contest with the button above!" 
                  : "Please log in to view your contests"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Extract Contest Card to a separate component
const ContestCard = ({ 
  contest, 
  handleImageError 
}: { 
  contest: Contest, 
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void 
}) => {
  return (
    <>
      {/* Contest card */}
      <div className="relative">
        <Image
          src={contest.thumbnailUrl || ""}
          alt={`${contest.title} thumbnail`}
          className="w-full h-48 object-cover rounded-md mb-2"
          width={500}
          height={300}
          onError={handleImageError}
          priority={true}
        />

        <div
          className={`absolute top-2 left-2 text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
            contest.status === "Active"
              ? "bg-[#ABEFC6] text-[#067647]"
              : contest.status === "Draft"
              ? "bg-[#F6F6F6] text-[#667085]"
              : contest.status === "Completed"
              ? "bg-[#FDD849] text-[#1A1A1A]"
              : contest.status === "Scheduled"
              ? "bg-[#DBEAFE] text-[#3B82F6]"
              : "bg-[#FFE5FB] text-[#FC52E4]"
          }`}
        >
          {contest.status === "Active" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ) : (
            <span
              className="inline-block w-1 h-1 rounded-full shrink-0"
              style={{
                backgroundColor:
                  contest.status === "Draft"
                    ? "#667085"
                    : contest.status === "Completed"
                    ? "#1A1A1A"
                    : contest.status === "Scheduled"
                    ? "#3B82F6"
                    : "#FC52E4",
              }}
            ></span>
          )}
          {contest.status}
          
          {contest.status === "Draft" && (
            <span className="ml-1 text-[#667085]">(Click to Edit)</span>
          )}
        </div>
      </div>

      <h3 className="text-lg font-medium mb-2">{contest.title}</h3>

      <div className="grid grid-cols-3 gap-4 mb-2">
        <div>
          <p className="text-xs text-[#475467]">Total Budget</p>
          <p className="text-sm">${contest.totalBudget}</p>
        </div>
        <div>
          <p className="text-xs text-[#475467]">Start Date</p>
          <p className="text-sm">{contest.startDate}</p>
        </div>
        <div>
          <p className="text-xs text-[#475467]">End Date</p>
          <p className="text-sm">{contest.endDate}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-3">
        <div>
          <p className="text-xs text-[#475467]">Contest Type</p>
          <p className="text-sm">{contest.contestType}</p>
        </div>
        <div>
          <p className="text-xs text-[#475467]">
            {contest.status === "Draft" ? "Status" : "Contestants"}
          </p>
          <p className="text-sm">
            {contest.status === "Draft"
              ? "In Progress"
              : contest.contestants}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#475467]">Metrics</p>
          <div className="flex items-center space-x-3 text-sm">
            <span className="flex items-center">
              <Image
                src="/icons/views.svg"
                alt="Views"
                width={20}
                height={20}
                className="mr-1"
              />
              {typeof contest.metrics.views === "number"
                ? contest.metrics.views > 1000
                  ? `${(contest.metrics.views / 1000).toFixed(1)}k`
                  : contest.metrics.views
                : contest.metrics.views || "0"}
            </span>
            <span className="flex items-center">
              <Image
                src="/icons/likes.svg"
                alt="Likes"
                width={15}
                height={15}
                className="mr-1"
              />
              {typeof contest.metrics.likes === "number"
                ? contest.metrics.likes > 1000
                  ? `${(contest.metrics.likes / 1000).toFixed(1)}k`
                  : contest.metrics.likes
                : contest.metrics.likes || "0"}
            </span>
            <span className="flex items-center">
              <Image
                src="/icons/comments.svg"
                alt="Comments"
                width={15}
                height={15}
                className="mr-1"
              />
              {typeof contest.metrics.comments === "number"
                ? contest.metrics.comments > 1000
                  ? `${(contest.metrics.comments / 1000).toFixed(
                      1
                    )}k`
                  : contest.metrics.comments
                : contest.metrics.comments || "0"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContestDashboard;
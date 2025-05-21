"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle, Clock, AlertCircle, DollarSign, Shield, User, ChevronLeft, ChevronRight } from "lucide-react";

interface PayoutStatus {
  userId: string;
  position: number;
  amount: number;
  status: "pending" | "completed" | "failed";
  error?: string;
  creatorName?: string;
  username?: string;
}

interface ContestWithPayouts {
  contestId: string;
  basic: {
    contestName: string;
    thumbnail?: string;
  };
  prizeTimeline: {
    endDate: string;
    startDate: string;
    winnerCount: number;
    totalBudget: number;
    positions: number[];
  };
  payoutsProcessed: boolean;
  payouts?: PayoutStatus[];
}

interface WinnerEligibility {
  userId: string;
  displayName: string;
  email: string;
  metrics: {
    views: number;
    likes: number;
    comments: number;
  };
  stripeAccountStatus: "ready" | "pending" | "not_connected" | "error" | "incomplete";
  payoutEligible: boolean;
}

interface EligibilitySummary {
  totalPotentialWinners: number;
  readyForPayout: number;
  pendingOnboarding: number;
  notConnected: number;
  errors: number;
}

interface EligibilityResponse {
  success: boolean;
  contestId: string;
  contestName: string;
  totalParticipants: number;
  potentialWinners: WinnerEligibility[];
  summary: EligibilitySummary;
}

// Tab type definition
type TabType = "pending" | "processed" | "active";

const AdminPayoutsPage: React.FC = () => {
  const [contests, setContests] = useState<ContestWithPayouts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingContestId, setProcessingContestId] = useState<string | null>(null);
  const [checkingEligibilityId, setCheckingEligibilityId] = useState<string | null>(null);
  const [eligibilityData, setEligibilityData] = useState<Record<string, EligibilityResponse>>({});
  const { currentUser } = useAuth();
  
  // Tab and pagination state
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, ] = useState(5);

  // Fetch all ended contests with payout information
  useEffect(() => {
    const fetchContests = async () => {
      if (!currentUser?.uid) return;

      try {
        setLoading(true);
        // Create an endpoint that returns all ended contests with their payout status
        const response = await fetch('/api/admin/contests-payouts');
        
        if (!response.ok) {
          throw new Error('Failed to fetch contests payouts data');
        }
        
        const data = await response.json();
        setContests(data.contests);
      } catch (err) {
        console.error('Error fetching contests:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, [currentUser]);

  // Check payout eligibility for a contest
  const checkPayoutEligibility = async (contestId: string) => {
    if (!contestId || !currentUser?.uid) return;
    
    try {
      setCheckingEligibilityId(contestId);
      setError(null);
      
      const response = await fetch('/api/contests/check-payout-eligibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contestId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check payout eligibility");
      }
      
      const data = await response.json();
      
      // Store eligibility data
      setEligibilityData(prev => ({
        ...prev,
        [contestId]: data
      }));
      
    } catch (err) {
      console.error("Error checking eligibility:", err);
      setError(err instanceof Error ? err.message : "Failed to check payout eligibility");
    } finally {
      setCheckingEligibilityId(null);
    }
  };

  // Handle processing payouts for a contest
  const handleProcessPayouts = async (contestId: string) => {
    if (!contestId || !currentUser?.uid) return;
    
    try {
      setProcessingContestId(contestId);
      setError(null);
      
      // Check eligibility first if we don't have the data already
      if (!eligibilityData[contestId]) {
        await checkPayoutEligibility(contestId);
      }
      
      // If we have eligibility data, check if there are any problems
      if (eligibilityData[contestId]) {
        const summary = eligibilityData[contestId].summary;
        
        if (summary.readyForPayout === 0) {
          throw new Error("No winners are eligible for payout. Please check eligibility details.");
        }
        
        if (summary.readyForPayout < summary.totalPotentialWinners) {
          // Continue with warning - will be handled in the UI
        }
      }
      
      const response = await fetch('/api/contests/process-payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contestId,
          adminId: currentUser.uid
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process payouts");
      }
      
      // Refresh the contests data after processing payouts
      const updatedContestsResponse = await fetch('/api/contests/check-payout-status');
      if (updatedContestsResponse.ok) {
        const data = await updatedContestsResponse.json();
        setContests(data.contests);
      }
      
    } catch (err) {
      console.error("Error processing payouts:", err);
      setError(err instanceof Error ? err.message : "Failed to process payouts");
    } finally {
      setProcessingContestId(null);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Render status badge
  const renderStatusBadge = (status: "pending" | "completed" | "failed", error?: string) => {
    switch (status) {
      case "completed":
        return (
          <div className="flex items-center text-green-600">
            <CheckCircle size={16} className="mr-1" />
            <span>Paid</span>
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center text-yellow-600">
            <Clock size={16} className="mr-1" />
            <span>Pending</span>
          </div>
        );
      case "failed":
        return (
          <div className="flex items-center text-red-600">
            <AlertCircle size={16} className="mr-1" />
            <span>Failed</span>
            {error && <span className="ml-1 text-xs">({error})</span>}
          </div>
        );
      default:
        return null;
    }
  };

  // Render Stripe account status badge
  const renderAccountStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return (
          <div className="flex items-center text-green-600">
            <CheckCircle size={16} className="mr-1" />
            <span>Ready</span>
          </div>
        );
      case "pending":
        return (
          <div className="flex items-center text-yellow-600">
            <Clock size={16} className="mr-1" />
            <span>Pending</span>
          </div>
        );
      case "not_connected":
        return (
          <div className="flex items-center text-gray-600">
            <User size={16} className="mr-1" />
            <span>Not Connected</span>
          </div>
        );
      case "error":
      case "incomplete":
        return (
          <div className="flex items-center text-red-600">
            <AlertCircle size={16} className="mr-1" />
            <span>Error</span>
          </div>
        );
      default:
        return null;
    }
  };

  // Filter contests into categories
  const pendingPayoutContests = contests.filter(c => !c.payoutsProcessed && new Date(c.prizeTimeline.endDate) < new Date());
  const processedPayoutContests = contests.filter(c => c.payoutsProcessed);
  const activeContests = contests.filter(c => new Date(c.prizeTimeline.endDate) >= new Date());

  // Get current contests for the active tab with pagination
  const getCurrentContests = () => {
    let filteredContests: ContestWithPayouts[] = [];
    
    switch (activeTab) {
      case "pending":
        filteredContests = pendingPayoutContests;
        break;
      case "processed":
        filteredContests = processedPayoutContests;
        break;
      case "active":
        filteredContests = activeContests;
        break;
    }
    
    // Calculate pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    
    return {
      contests: filteredContests.slice(indexOfFirstItem, indexOfLastItem),
      totalContests: filteredContests.length,
      totalPages: Math.ceil(filteredContests.length / itemsPerPage)
    };
  };

  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Get current paginated data
  const { contests: paginatedContests, totalContests, totalPages } = getCurrentContests();

  // Tab data for rendering
  const tabs = [
    { id: "pending", label: `Pending Payouts (${pendingPayoutContests.length})`, color: "orange" },
    { id: "processed", label: `Processed Payouts (${processedPayoutContests.length})`, color: "green" },
    { id: "active", label: `Active Contests (${activeContests.length})`, color: "blue" }
  ];

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				Loading payouts data...
			</div>
    );
  }

  return (
    <div className="p-8">
      
      {/* Display any errors at the top */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setCurrentPage(1); // Reset to first page when changing tabs
              }}
              className={`py-3 px-6 font-medium text-sm rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? `bg-${tab.color}-50 text-${tab.color}-700 border-t border-l border-r border-${tab.color}-200`
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="mb-6">
        {/* No contests message */}
        {paginatedContests.length === 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm text-gray-600 border border-gray-100">
            No contests found in this category.
          </div>
        )}
        
        {/* Pending Payouts Content */}
        {activeTab === "pending" && paginatedContests.length > 0 && (
          <div className="space-y-6  md:w-[70rem]">
            {paginatedContests.map(contest => (
              <div key={contest.contestId} className="rounded-lg bg-white shadow-sm overflow-hidden border border-gray-100">
                <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-900">{contest.basic.contestName}</h3>
                    <div className="flex items-center">
                      <span className="mr-6 text-sm text-gray-600">
                        Ended: {formatDate(contest.prizeTimeline.endDate)}
                      </span>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => checkPayoutEligibility(contest.contestId)}
                          disabled={checkingEligibilityId === contest.contestId}
                          className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 border border-gray-200 transition-all flex items-center"
                        >
                          {checkingEligibilityId === contest.contestId ? (
                            "Checking..."
                          ) : (
                            <>
                              <Shield size={16} className="mr-2" />
                              Check Eligibility
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleProcessPayouts(contest.contestId)}
                          disabled={processingContestId === contest.contestId}
                          className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-orange-300 transition-all flex items-center shadow-sm"
                        >
                          {processingContestId === contest.contestId ? (
                            "Processing..."
                          ) : (
                            <>
                              <DollarSign size={16} className="mr-2" />
                              Process Payouts
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-5">
                  <div className="flex items-center mb-4">
                    <span className="font-medium mr-2">Total Prize Budget:</span>
                    <span className="text-orange-600 font-bold">{formatCurrency(contest.prizeTimeline.totalBudget)}</span>
                  </div>
                  
                  {/* Eligibility Summary */}
                  {eligibilityData[contest.contestId] && (
                    <div className="mb-6 bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                      <div className="font-semibold mb-3 border-b pb-2 text-gray-700">Payout Eligibility Summary</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <div className="text-xs text-gray-500 mb-1">Total Winners</div>
                          <div className="font-bold text-gray-800 text-lg">{eligibilityData[contest.contestId].summary.totalPotentialWinners}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                          <div className="text-xs text-gray-500 mb-1">Ready for Payout</div>
                          <div className="font-bold text-green-700 text-lg">{eligibilityData[contest.contestId].summary.readyForPayout}</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                          <div className="text-xs text-gray-500 mb-1">Pending Setup</div>
                          <div className="font-bold text-orange-700 text-lg">{eligibilityData[contest.contestId].summary.pendingOnboarding}</div>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                          <div className="text-xs text-gray-500 mb-1">Not Connected</div>
                          <div className="font-bold text-red-700 text-lg">{eligibilityData[contest.contestId].summary.notConnected + eligibilityData[contest.contestId].summary.errors}</div>
                        </div>
                      </div>
                      
                      {/* Warning if not all winners are eligible */}
                      {eligibilityData[contest.contestId].summary.readyForPayout < eligibilityData[contest.contestId].summary.totalPotentialWinners && (
                        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-md text-sm mb-4">
                          <span className="font-semibold">Warning:</span> {eligibilityData[contest.contestId].summary.totalPotentialWinners - eligibilityData[contest.contestId].summary.readyForPayout} out of {eligibilityData[contest.contestId].summary.totalPotentialWinners} winners are not ready to receive payouts.
                        </div>
                      )}
                      
                      {/* Winner Details */}
                      <div className="mt-4">
                        <div className="text-sm font-semibold mb-2 text-gray-700">Potential Winners:</div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 border border-gray-100 rounded-lg overflow-hidden">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creator</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eligibility</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {eligibilityData[contest.contestId].potentialWinners.map((winner, index) => (
                                <tr key={winner.userId} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">#{index + 1}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                    <div className="font-medium">{winner.displayName}</div>
                                    <div className="text-xs text-gray-500">{winner.email}</div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                    {formatNumber(winner.metrics.views)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    {renderAccountStatusBadge(winner.stripeAccountStatus)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    {winner.payoutEligible ? (
                                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Eligible</span>
                                    ) : (
                                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Not Eligible</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <div className="font-semibold mb-3 border-b pb-2 text-gray-700">Winner Positions</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {Array.from({ length: contest.prizeTimeline.winnerCount }).map((_, index) => {
                        const position = index + 1;
                        const prizeAmount = contest.prizeTimeline.positions[index] || 0;
                        
                        return (
                          <div key={position} className={`rounded-lg p-3 flex justify-between items-center border ${position === 1 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                            <span className={`font-medium ${position === 1 ? 'text-green-700' : 'text-gray-700'}`}>
                              Position #{position}
                            </span>
                            <span className={`font-bold ${position === 1 ? 'text-green-700' : 'text-gray-700'}`}>
                              {formatCurrency(prizeAmount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Processed Payouts Content */}
        {activeTab === "processed" && paginatedContests.length > 0 && (
          <div className="space-y-6  md:w-[70rem]">
            {paginatedContests.map(contest => (
              <div key={contest.contestId} className="rounded-lg bg-white shadow-sm overflow-hidden border border-gray-100">
                <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-900">{contest.basic.contestName}</h3>
                    <span className="text-sm text-gray-600">
                      Ended: {formatDate(contest.prizeTimeline.endDate)}
                    </span>
                  </div>
                </div>
                
                <div className="p-5">
                  <div className="flex items-center mb-4">
                    <span className="font-medium mr-2">Total Prize Budget:</span>
                    <span className="text-green-600 font-bold">{formatCurrency(contest.prizeTimeline.totalBudget)}</span>
                  </div>
                  
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <div className="font-semibold mb-3 border-b pb-2 text-gray-700">Payout Details</div>
                    {contest.payouts && contest.payouts.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-100 rounded-lg overflow-hidden">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creator</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {contest.payouts.map((payout, index) => (
                              <tr key={payout.userId} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">#{payout.position}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                  {payout.creatorName || payout.username || payout.userId}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                                  {formatCurrency(payout.amount)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  {renderStatusBadge(payout.status, payout.error)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">No payout details available</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Active Contests Content */}
        {activeTab === "active" && paginatedContests.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:w-[70rem]">
            {paginatedContests.map(contest => (
              <div key={contest.contestId} className="rounded-lg bg-white shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                  <h3 className="font-bold text-gray-900">{contest.basic.contestName}</h3>
                </div>
                
                <div className="p-5">
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <div className="mb-2">
                        <span className="font-medium text-gray-700">End Date:</span>{' '}
                        <span className="text-gray-600">{formatDate(contest.prizeTimeline.endDate)}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Prize Budget:</span>{' '}
                        <span className="text-orange-600 font-bold">{formatCurrency(contest.prizeTimeline.totalBudget)}</span>
                      </div>
                    </div>
                    
                    
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center text-sm text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalContests)} of {totalContests} results
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Previous Page Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-md border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>
            
            {/* Page Buttons */}
            <div className="flex items-center space-x-1">
              {/* First page */}
              {currentPage > 2 && (
                <button
                onClick={() => handlePageChange(1)}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50"
              >
                1
              </button>
            )}
            
            {/* Ellipsis if needed */}
            {currentPage > 3 && (
              <span className="w-8 h-8 flex items-center justify-center">...</span>
            )}
            
            {/* Previous page if not first */}
            {currentPage > 1 && (
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50"
              >
                {currentPage - 1}
              </button>
            )}
            
            {/* Current page */}
            <button
              className="w-8 h-8 flex items-center justify-center rounded-md bg-orange-500 text-white font-medium"
            >
              {currentPage}
            </button>
            
            {/* Next page if not last */}
            {currentPage < totalPages && (
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50"
              >
                {currentPage + 1}
              </button>
            )}
            
            {/* Ellipsis if needed */}
            {currentPage < totalPages - 2 && (
              <span className="w-8 h-8 flex items-center justify-center">...</span>
            )}
            
            {/* Last page */}
            {currentPage < totalPages - 1 && (
              <button
                onClick={() => handlePageChange(totalPages)}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50"
              >
                {totalPages}
              </button>
            )}
          </div>
          
          {/* Next Page Button */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-md border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    )}
  </div>
);
};

export default AdminPayoutsPage;
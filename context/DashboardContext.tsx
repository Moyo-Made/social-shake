"use client"

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types
interface UserData {
  totalProjectsParticipated: number;
  summary: {
    acceptedProjects: number;
    completedProjects: number;
    activeContestEntries: number;
    winningEntries: number;
  };
  activeProjects: number;
  activeContests: number;
  totalEarnings: number;
  pendingPayout: number;
  projects: Array<{
    projectId: string;
    projectName: string;
    status: string;
    applicationStatus?: string;
    approvedVideos: number;
    totalVideos: number;
    completionPercentage: number;
  }>;
  contests: Array<{
    contestId: string;
    contestName: string;
    status: string;
    submissionCount: number;
    hasWinningEntry: boolean;
  }>;
}

interface EarningsData {
  totalEarnings: number;
  pendingPayout: number;
  completedPayouts: Array<{
    payoutId: string;
    amount: number;
    date: string;
    status: string;
  }>;
  pendingPayouts: Array<{
    payoutId: string;
    amount: number;
    date: string;
    status: string;
  }>;
}

interface DashboardContextType {
  userData: UserData | null;
  earningsData: EarningsData | null;
  loading: boolean;
  error: string | null;
  fetchDashboardData: (userId: string, forceRefresh?: boolean) => Promise<void>;
  refreshData: (userId: string) => Promise<void>;
  clearCache: () => void;
}

// Create Context
const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// Cache interface
interface CacheEntry {
  userData: UserData | null;
  earningsData: EarningsData | null;
  timestamp: number;
  userId: string;
}

// Provider Props
interface DashboardProviderProps {
  children: ReactNode;
  cacheTimeout?: number; // in milliseconds, default 5 minutes
}

// Provider Component
export const DashboardProvider: React.FC<DashboardProviderProps> = ({ 
  children, 
  cacheTimeout = 5 * 60 * 1000 // 5 minutes default
}) => {
  const [cache, setCache] = useState<CacheEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCacheValid = useCallback((userId: string): boolean => {
    if (!cache || cache.userId !== userId) return false;
    
    const now = Date.now();
    const cacheAge = now - cache.timestamp;
    
    return cacheAge < cacheTimeout;
  }, [cache, cacheTimeout]);

  const fetchDashboardData = useCallback(async (userId: string, forceRefresh = false) => {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && isCacheValid(userId)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch both API endpoints concurrently
      const [userResponse, earningsResponse] = await Promise.all([
        fetch(`/api/creator-stats?userId=${userId}`),
        fetch(`/api/creator-earnings?userId=${userId}`)
      ]);

      const userData = await userResponse.json();
      const earningsData = await earningsResponse.json();

      let newUserData: UserData | null = null;
      let newEarningsData: EarningsData | null = null;

      if (userData.success) {
        newUserData = userData.data;
      } else {
        console.error("Error fetching user data:", userData.error);
        setError(userData.error || "Failed to fetch user data");
      }

      if (earningsData.success) {
        newEarningsData = earningsData.data;
      } else {
        console.error("Error fetching earnings data:", earningsData.error);
        setError(earningsData.error || "Failed to fetch earnings data");
      }

      // Update cache
      setCache({
        userData: newUserData,
        earningsData: newEarningsData,
        timestamp: Date.now(),
        userId
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch dashboard data";
      console.error("Failed to fetch dashboard data:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isCacheValid]);

  const refreshData = useCallback(async (userId: string) => {
    await fetchDashboardData(userId, true);
  }, [fetchDashboardData]);

  const clearCache = useCallback(() => {
    setCache(null);
    setError(null);
  }, []);

  const contextValue: DashboardContextType = {
    userData: cache?.userData || null,
    earningsData: cache?.earningsData || null,
    loading,
    error,
    fetchDashboardData,
    refreshData,
    clearCache
  };

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};

// Custom Hook
export const useDashboard = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
import { useQuery } from '@tanstack/react-query';

interface PerformanceStatsCardProps {
  userId: string;
}

interface StatsData {
  success: boolean;
  data: {
    summary: {
      totalProjectsParticipated?: number;
      totalViews?: number;
      contestsWon?: number;
      winningEntries?: number;
    };
  };
}

const PerformanceStatsCard = ({ userId }: PerformanceStatsCardProps) => {
  const fetchStats = async (): Promise<StatsData> => {
    const response = await fetch(`/api/creator-stats?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    return response.json();
  };

  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ['creator-stats', userId],
    queryFn: fetchStats,
    enabled: !!userId, // Only run query if userId exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const stats = {
    totalProjects: data?.data?.summary?.totalProjectsParticipated || 0,
    totalViews: data?.data?.summary?.totalViews || 0,
    contestsWon: data?.data?.summary?.contestsWon || data?.data?.summary?.winningEntries || 0,
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-[#FDE5D7] rounded-lg p-4 md:p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-4 md:p-6">
        <div className="text-center text-red-600">
          <p className="text-sm">Failed to load performance stats</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#FDE5D7] rounded-lg p-4 md:p-6">
      <h3 className="text-base md:text-lg font-semibold mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
        Performance Stats
      </h3>
             
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <p className="text-lg md:text-xl font-bold text-orange-600">
            {stats.totalProjects}
          </p>
          <p className="text-xs md:text-sm text-gray-600">
            Total Projects
          </p>
        </div>
                 
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-lg md:text-xl font-bold text-blue-600">
            {formatNumber(stats.totalViews)}+
          </p>
          <p className="text-xs md:text-sm text-gray-600">
            Total Views
          </p>
        </div>
                 
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-lg md:text-xl font-bold text-green-600">
            {stats.contestsWon}
          </p>
          <p className="text-xs md:text-sm text-gray-600">
            Contests Won
          </p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceStatsCard;
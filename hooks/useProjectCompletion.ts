import { useMemo, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { CreatorSubmission } from '@/types/submission';
import { ProjectFormData } from '@/types/contestFormData';

interface ProjectCompletionStatus {
  status: 'in_progress' | 'pending_deliverables' | 'completed';
  canAutoComplete: boolean;
  reason: string;
  completedVideos: number;
  totalVideosRequired: number;
  completionPercentage: number;
}

interface UseProjectCompletionProps {
  submissionsList: CreatorSubmission[];
  projectFormData: ProjectFormData;
  projectId: string;
  projectType?: string;
}

export const useProjectCompletion = ({
  submissionsList,
  projectFormData,
  projectId,
  projectType
}: UseProjectCompletionProps) => {

  // Calculate completion metrics
  const completionMetrics = useMemo(() => {
    const totalVideosRequired = projectFormData?.creatorPricing?.videosPerCreator
      ? projectFormData.creatorPricing.videosPerCreator * (projectFormData.creatorPricing.creatorCount || 1)
      : submissionsList.length;

    // Count completed videos based on status
    const completedVideos = submissionsList.filter(sub => 
      ['pending', 'approved', 'spark_requested', 'spark_received', 'spark_verified', 
       'tiktokLink_requested', 'tiktokLink_received', 'tiktokLink_verified', 
       'awaiting_payment', 'payment_confirmed'].includes(sub.status)
    ).length;

    const completionPercentage = totalVideosRequired > 0 
      ? (completedVideos / totalVideosRequired) * 100 
      : 0;

    return {
      completedVideos,
      totalVideosRequired,
      completionPercentage
    };
  }, [submissionsList, projectFormData]);

  // Determine project completion status
  const completionStatus = useMemo((): ProjectCompletionStatus => {
    const { completedVideos, totalVideosRequired, completionPercentage } = completionMetrics;

    // Final completion statuses for each project type
    const getFinalStatuses = (type: string) => {
      switch (type) {
        case "UGC Content Only":
        case "TikTok Shop":
          return ['approved', 'awaiting_payment', 'payment_confirmed'];
        case "Spark Ads":
          return ['spark_verified', 'awaiting_payment', 'payment_confirmed'];
        case "Creator-Posted UGC":
          return ['tiktokLink_verified', 'awaiting_payment', 'payment_confirmed'];
        default:
          return ['approved', 'spark_verified', 'tiktokLink_verified', 'awaiting_payment', 'payment_confirmed'];
      }
    };

    const finalStatuses = getFinalStatuses(projectType || '');
    const fullyCompletedSubmissions = submissionsList.filter(sub => 
      finalStatuses.includes(sub.status)
    );

    const allVideosCompleted = completedVideos >= totalVideosRequired;
    const allDeliverabletsCompleted = fullyCompletedSubmissions.length >= totalVideosRequired;

    // Base metrics
    const baseStatus = {
      completedVideos,
      totalVideosRequired,
      completionPercentage
    };

    // Not all videos are approved yet
    if (!allVideosCompleted) {
      return {
        ...baseStatus,
        status: 'in_progress',
        canAutoComplete: false,
        reason: `${completedVideos}/${totalVideosRequired} videos completed`
      };
    }

    // All videos approved, check deliverables based on project type
    if (!allDeliverabletsCompleted) {
      const pendingDeliverables = submissionsList.filter(sub => 
        ['approved', 'spark_requested', 'spark_received', 'tiktokLink_requested', 'tiktokLink_received'].includes(sub.status)
      ).length;

      let deliverableType = 'final deliverables';
      if (projectType === 'Spark Ads') deliverableType = 'spark codes';
      if (projectType === 'Creator-Posted UGC') deliverableType = 'TikTok links';

      return {
        ...baseStatus,
        status: 'pending_deliverables',
        canAutoComplete: false,
        reason: `All videos approved, waiting for ${pendingDeliverables} ${deliverableType}`
      };
    }

    // Everything is complete
    return {
      ...baseStatus,
      status: 'completed',
      canAutoComplete: true,
      reason: 'All videos approved and deliverables received'
    };

  }, [submissionsList, projectFormData, projectType, completionMetrics]);

  // Auto-complete project function
  const autoCompleteProject = useCallback(async () => {
    if (!completionStatus.canAutoComplete) return false;

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const token = await currentUser.getIdToken();

      const response = await fetch('/api/projects/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          completionType: 'automatic',
          reason: completionStatus.reason,
          completedAt: new Date().toISOString(),
          completionMetrics: {
            totalVideos: completionStatus.totalVideosRequired,
            completedVideos: completionStatus.completedVideos,
            projectType
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to auto-complete project: ${response.statusText}`);
      }

      toast.success('Project automatically marked as completed!');
      return true;

    } catch (error) {
      console.error('Error auto-completing project:', error);
      // Don't show error toast for auto-completion failures to avoid spam
      return false;
    }
  }, [projectId, completionStatus, projectType]);

  // Manual complete project function (for admin use)
  const manualCompleteProject = useCallback(async (reason?: string) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const token = await currentUser.getIdToken();

      const response = await fetch('/api/projects/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          completionType: 'manual',
          reason: reason || 'Manually completed by admin',
          completedAt: new Date().toISOString(),
          completionMetrics: {
            totalVideos: completionStatus.totalVideosRequired,
            completedVideos: completionStatus.completedVideos,
            projectType
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to complete project: ${response.statusText}`);
      }

      toast.success('Project marked as completed!');
      return true;

    } catch (error) {
      console.error('Error completing project:', error);
      toast.error('Failed to complete project');
      return false;
    }
  }, [projectId, completionStatus, projectType]);

  return {
    completionStatus,
    completionMetrics,
    autoCompleteProject,
    manualCompleteProject,
    // Convenience getters
    isCompleted: completionStatus.status === 'completed',
    canAutoComplete: completionStatus.canAutoComplete,
    isInProgress: completionStatus.status === 'in_progress',
    isPendingDeliverables: completionStatus.status === 'pending_deliverables'
  };
};
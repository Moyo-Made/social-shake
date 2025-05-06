import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';
import { DocumentData } from 'firebase-admin/firestore';
import { Contest } from '@/types/contests'; // Import Contest from types

// Interface for project applications
interface ProjectApplication {
  userId: string;
  projectId: string;
  status: string;
  createdAt: FirebaseFirestore.Timestamp | string;
  updatedAt: FirebaseFirestore.Timestamp | string;
}

// Interface for project submissions
interface ProjectSubmission {
  userId: string;
  projectId: string;
  status: string;
  paymentStatus?: string;
  amount?: number;
}

// Interface for project data
interface ProjectData extends DocumentData {
  projectId: string;
  status?: string;
  applicationStatus?: string;
  creatorPricing?: {
    budgetPerVideo?: number;
    totalVideos?: number;
    videosPerCreator?: number;
    totalAmount?: number;
    totalBudget?: number;
    creator?: {
      totalVideos?: number;
    };
  };
  projectDetails?: {
    projectName?: string;
    projectDescription?: string;
    projectThumbnail?: string;
  };
  paidfalse?: boolean;
  paymentAmount?: number | null;
}

// Interface for contest submissions
interface ContestSubmission {
  userId: string;
  contestId: string;
  isWinner?: boolean;
  prizeAmount?: number;
  paymentStatus?: string;
  createdAt?: FirebaseFirestore.Timestamp | string;
  status?: string;
}

// Interface for project details
interface ProjectDetail {
  projectId: string;
  projectName: string;
  projectThumbnail?: string;
  status: string;
  applicationStatus?: string;
  approvedVideos: number;
  totalVideos: number;
  budgetPerVideo: number;
  completionPercentage: number;
}

export async function GET(request: NextRequest) {
  try {
    // Get userId from query params
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || url.searchParams.get("creatorId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    console.log(`Fetching stats for creator: ${userId}`);

    // === FETCH PROJECT APPLICATIONS ===
    console.log("Fetching project applications...");
    const projectApplicationsSnapshot = await adminDb
      .collection("project_applications")
      .where("userId", "==", userId)
      .get();
    
    console.log(`Found ${projectApplicationsSnapshot.size} project applications`);
    
    const projectApplications = projectApplicationsSnapshot.docs.map(doc => {
      const data = doc.data() as ProjectApplication;
      return {
        id: doc.id,
        projectId: data.projectId,
        status: data.status
      };
    });

    // === FETCH PROJECT DETAILS ===
    console.log("Fetching project details...");
    const projectDetails: ProjectDetail[] = [];
    
    await Promise.all(projectApplications.map(async (app) => {
      try {
        // Get project document
        const projectDoc = await adminDb
          .collection("projects")
          .doc(app.projectId)
          .get();
          
        if (!projectDoc.exists) {
          console.log(`Project ${app.projectId} not found`);
          return;
        }
        
        const projectData = projectDoc.data() as ProjectData;
        
        // Get submissions for this project
        const submissionsSnapshot = await adminDb
          .collection('project_submissions')
          .where('userId', '==', userId)
          .where('projectId', '==', app.projectId)
          .get();
        
        const approvedSubmissions = submissionsSnapshot.docs.filter(
          doc => (doc.data() as ProjectSubmission).status === 'approved'
        ).length;
        
        // Extract video requirements from project data
        let totalVideos = 0;
        if (projectData.creatorPricing) {
          if (projectData.creatorPricing.videosPerCreator) {
            totalVideos = projectData.creatorPricing.videosPerCreator;
          } else if (projectData.creatorPricing.totalVideos) {
            totalVideos = projectData.creatorPricing.totalVideos;
          } else if (projectData.creatorPricing.creator?.totalVideos) {
            totalVideos = projectData.creatorPricing.creator.totalVideos;
          }
        }
        
        // Calculate budget per video
        let budgetPerVideo = 0;
        if (projectData.creatorPricing?.budgetPerVideo) {
          budgetPerVideo = projectData.creatorPricing.budgetPerVideo;
        }
        
        projectDetails.push({
          projectId: app.projectId,
          projectName: projectData.projectDetails?.projectName || "Unnamed Project",
          projectThumbnail: projectData.projectDetails?.projectThumbnail,
          status: projectData.status || "unknown",
          applicationStatus: app.status,
          approvedVideos: approvedSubmissions,
          totalVideos: totalVideos,
          budgetPerVideo: budgetPerVideo,
          completionPercentage: totalVideos > 0 ? (approvedSubmissions / totalVideos) * 100 : 0
        });
      } catch (error) {
        console.error(`Error processing project ${app.projectId}:`, error);
      }
    }));

    // === FETCH CONTEST SUBMISSIONS ===
    console.log("Fetching contest submissions...");
    const contestSubmissionsSnapshot = await adminDb
      .collection("contest_submissions")
      .where("userId", "==", userId)
      .get();
      
    console.log(`Found ${contestSubmissionsSnapshot.size} contest submissions`);
    
    const contestSubmissions = contestSubmissionsSnapshot.docs.map(doc => {
      const data = doc.data() as ContestSubmission;
      return {
        id: doc.id,
        contestId: data.contestId,
        isWinner: data.isWinner || false,
        prizeAmount: data.prizeAmount || 0,
        paymentStatus: data.paymentStatus || 'unpaid',
        status: data.status
      };
    });
    
    // Group submissions by contestId
    const contestsMap = new Map<string, ContestSubmission[]>();
    contestSubmissions.forEach(submission => {
      if (!submission.contestId) return;
      
      if (!contestsMap.has(submission.contestId)) {
        contestsMap.set(submission.contestId, []);
      }
      contestsMap.get(submission.contestId)?.push({
        ...submission,
        userId
      });
    });
    
    // === FETCH CONTEST DETAILS ===
    console.log("Fetching contest details...");
    const contestDetails: Contest[] = [];
    
    await Promise.all(Array.from(contestsMap.keys()).map(async (contestId) => {
      try {
        const contestDoc = await adminDb
          .collection("contests")
          .doc(contestId)
          .get();
          
        if (!contestDoc.exists) {
          console.log(`Contest ${contestId} not found`);
          return;
        }
        
        // Get raw data as is from Firestore
        const contestData = contestDoc.data() as Contest;
        const submissions = contestsMap.get(contestId) || [];
        
        // Check if user has a winning entry
        const hasWinningEntry = submissions.some(submission => submission.isWinner);
        
        // Find the prize amount for winning entries
        let prizeAmount = 0;
        const winningSubmission = submissions.find(submission => submission.isWinner);
        if (winningSubmission && winningSubmission.prizeAmount) {
          prizeAmount = winningSubmission.prizeAmount;
        } else if (contestData.prizeTimeline?.positions?.[0] && hasWinningEntry) {
          // If winner but no prize amount stored, use the first position prize
          prizeAmount = contestData.prizeTimeline.positions[0];
        }
        
        // Create a Contest object with only the fields that exist in Firebase
        // and add minimal calculated fields
        const contest: Contest = {
          ...contestData,
          // Ensure these fields exist
          contestId: contestId,
          userId: userId,
          // Add only essential computed properties
          applicantsCount: submissions.length,
          hasWinningEntry: hasWinningEntry,
          prizeAmount: prizeAmount
        };
        
        contestDetails.push(contest);
      } catch (error) {
        console.error(`Error processing contest ${contestId}:`, error);
      }
    }));

    // === CALCULATE EARNINGS AND PENDING PAYMENTS ===
    console.log("Calculating earnings and pending payments...");
    let totalEarnings = 0;
    let pendingPayout = 0;
    
    // Calculate project earnings
    for (const project of projectDetails) {
      // Check for 'approved' or 'accepted' status
      if ((project.applicationStatus === "accepted" || project.applicationStatus === "approved") && project.status === "completed") {
        const amount = project.budgetPerVideo * project.approvedVideos;
        totalEarnings += amount;
        
        // For projects that aren't marked as paid
        try {
          const projectDoc = await adminDb.collection("projects").doc(project.projectId).get();
          if (projectDoc.exists) {
            const data = projectDoc.data() as ProjectData;
            // Check if project is paid
            if (!data.paidfalse && data.paymentAmount === null) {
              pendingPayout += amount;
            }
          }
        } catch (error) {
          console.error(`Error checking payment status for project ${project.projectId}:`, error);
        }
      } else if ((project.applicationStatus === "accepted" || project.applicationStatus === "approved") && project.status === "active") {
        // For active projects with approved videos
        if (project.approvedVideos > 0) {
          const amount = project.budgetPerVideo * project.approvedVideos;
          pendingPayout += amount;
          // Also add to total earnings since these videos are approved
          totalEarnings += amount;
        }
      }
    }
    
    // Calculate contest earnings
    contestDetails.forEach(contest => {
      if (contest.hasWinningEntry && contest.prizeAmount) {
        totalEarnings += contest.prizeAmount;
        
        // Check if the prize has been paid
        const submissions = contestsMap.get(contest.contestId) || [];
        const winningSubmission = submissions.find(s => s.isWinner);
        
        if (winningSubmission && winningSubmission.paymentStatus !== "paid") {
          pendingPayout += contest.prizeAmount;
        }
      }
    });

    // Count active projects and contests
    const activeProjects = projectDetails.filter(p => 
      p.status === "active" && (p.applicationStatus === "accepted" || p.applicationStatus === "approved" || p.applicationStatus === "accepting pitches")
    ).length;
    
    // Only count contests with status "active"
    const activeContests = contestDetails.filter(c => c.status === "active").length;
      
    // Create summary stats
    const summary = {
      acceptedProjects: projectDetails.filter(p => 
        p.applicationStatus === "accepted" || p.applicationStatus === "approved"
      ).length,
      completedProjects: projectDetails.filter(p => 
        (p.applicationStatus === "accepted" || p.applicationStatus === "approved") && 
        p.status === "completed"
      ).length,
      activeContestEntries: contestSubmissions.filter(s => {
        const contest = contestDetails.find(c => c.contestId === s.contestId);
        return contest && contest.status === "active"; // Match only "active" status
      }).length,
      winningEntries: contestSubmissions.filter(s => s.isWinner).length
    };

    // Return combined stats with the imported Contest interface
    return NextResponse.json({
      success: true,
      data: {
        summary,
        activeProjects,
        activeContests,
        totalEarnings,
        pendingPayout,
        projects: projectDetails.map(project => ({
          projectId: project.projectId,
          projectName: project.projectName,
          projectThumbnail: project.projectThumbnail,
          status: project.status,
          applicationStatus: project.applicationStatus,
          approvedVideos: project.approvedVideos,
          totalVideos: project.totalVideos,
          completionPercentage: project.completionPercentage,
          budgetPerVideo: project.budgetPerVideo
        })),
        contests: contestDetails
      }
    });
  } catch (error) {
    console.error("Error fetching creator stats:", error);
    
    return NextResponse.json(
      {
        error: "Failed to fetch creator statistics",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
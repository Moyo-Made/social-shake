import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Fetch all projects for the user
    const projectsSnapshot = await adminDb
      .collection("projects")
      .where("userId", "==", userId)
      .get();

    const projects = projectsSnapshot.docs.map(doc => doc.data());
    
    // Fetch all contests for the user
    const contestsSnapshot = await adminDb
      .collection("contests")
      .where("userId", "==", userId)
      .get();

    const contests = contestsSnapshot.docs.map(doc => doc.data());

    // Calculate total spend
    let totalSpend = 0;

    // Add up project budgets
    projects.forEach(project => {
      if (project.creatorPricing?.budgetPerVideo) {
        totalSpend += Number(project.creatorPricing.budgetPerVideo);
      }
    });

    // Add up contest prizes
    contests.forEach(contest => {
      if (contest.prizeTimeline?.firstPrize) {
        totalSpend += Number(contest.prizeTimeline.firstPrize);
      }
      if (contest.prizeTimeline?.secondPrize) {
        totalSpend += Number(contest.prizeTimeline.secondPrize);
      }
      if (contest.prizeTimeline?.thirdPrize) {
        totalSpend += Number(contest.prizeTimeline.thirdPrize);
      }
      
      // Add participation incentives if they exist
      if (contest.incentives?.participationAmount && contest.incentives?.participationCount) {
        totalSpend += Number(contest.incentives.participationAmount) * 
                     Number(contest.incentives.participationCount);
      }
    });

    // Get active drafts
    const projectDraftDoc = await adminDb
      .collection("projectDrafts")
      .doc(userId)
      .get();
    
    const contestDraftDoc = await adminDb
      .collection("contestDrafts")
      .doc(userId)
      .get();

    const projectDraft = projectDraftDoc.exists && !projectDraftDoc.data()?.submitted 
      ? projectDraftDoc.data() 
      : null;
    
    const contestDraft = contestDraftDoc.exists && !contestDraftDoc.data()?.submitted 
      ? contestDraftDoc.data() 
      : null;

    // Return combined stats
    return NextResponse.json({
      success: true,
      data: {
        totalProjects: projects.length,
        totalContests: contests.length,
        totalSpend: totalSpend,
        projects: projects,
        contests: contests,
        hasProjectDraft: projectDraft !== null,
        hasContestDraft: contestDraft !== null,
        summary: {
          activeProjects: projects.filter(p => p.status === "Accepting Pitches").length,
          completedProjects: projects.filter(p => p.status === "Completed").length,
          activeContests: contests.filter(c => c.status === "active").length,
          completedContests: contests.filter(c => c.status === "completed").length,
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch user statistics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
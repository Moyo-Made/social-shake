import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { DocumentData, FieldPath, Timestamp } from "firebase-admin/firestore";
import { Contest } from "@/types/contests"; // Import Contest from types

// Interface for project applications
interface ProjectApplication {
	userId: string;
	projectId: string;
	status: string;
	createdAt: Timestamp | string;
	updatedAt: Timestamp | string;
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
	createdAt?: Timestamp | string;
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
		const userId =
			url.searchParams.get("userId") || url.searchParams.get("creatorId");

		if (!userId) {
			return NextResponse.json(
				{ error: "userId is required" },
				{ status: 400 }
			);
		}

		// === IMPROVED APPROACH FOR CALCULATING CREATOR STATS ===

		// 1. REPLACE PROJECT APPLICATIONS APPROACH WITH DIRECT PROJECT QUERY
		console.log("Fetching projects where creator participated...");

		// Query projects where creator has accepted applications
		const acceptedProjectsQuery = adminDb
			.collection("project_applications")
			.where("userId", "==", userId)
			.where("status", "in", ["accepted", "approved"]);

		const acceptedApplicationsSnapshot = await acceptedProjectsQuery.get();
		const acceptedProjectIds = acceptedApplicationsSnapshot.docs.map(
			(doc) => doc.data().projectId
		);

		// Get actual project data for these projects
		let actualProjects: {
      status: string;
      applicationStatus: string; id: string; 
}[] = [];
		if (acceptedProjectIds.length > 0) {
			// Batch get projects (Firestore limit is 10 per batch)
			const projectBatches = [];
			for (let i = 0; i < acceptedProjectIds.length; i += 10) {
				const batch = acceptedProjectIds.slice(i, i + 10);
				const projectsSnapshot = await adminDb
					.collection("projects")
					.where(FieldPath.documentId(), "in", batch)
					.get();

				projectBatches.push(...projectsSnapshot.docs);
			}

			actualProjects = projectBatches.map((doc) => ({
				id: doc.id,
				status: doc.data().status || "unknown", // Provide a default value if status is missing
				applicationStatus: doc.data().applicationStatus || "unknown", // Provide a default value if applicationStatus is missing
				...doc.data(),
			}));
		}

		console.log(
			`Found ${actualProjects.length} actual projects where creator participated`
		);

		// 2. ALTERNATIVE: QUERY BY PROJECT_SUBMISSIONS FOR MORE ACCURATE COUNT
		console.log("Cross-checking with project submissions...");
		const submissionsSnapshot = await adminDb
			.collection("project_submissions")
			.where("userId", "==", userId)
			.get();

		const submissionsByProject = new Map();
		submissionsSnapshot.docs.forEach((doc) => {
			const data = doc.data();
			if (!submissionsByProject.has(data.projectId)) {
				submissionsByProject.set(data.projectId, []);
			}
			submissionsByProject.get(data.projectId).push(data);
		});

		const projectsWithSubmissions = Array.from(submissionsByProject.keys());
		console.log(
			`Creator has submissions in ${projectsWithSubmissions.length} projects`
		);

		// 3. IMPROVED VIEWS CALCULATION WITH BETTER LOGGING
		console.log("Fetching creator metrics with detailed logging...");
		let totalViews = 0;

		try {
			const creatorDoc = await adminDb.collection("creators").doc(userId).get();

			if (creatorDoc.exists) {
				const creatorData = creatorDoc.data();

				// Log the complete structure for debugging
				console.log("=== CREATOR DATA STRUCTURE DEBUG ===");
				console.log("Top level keys:", Object.keys(creatorData || {}));

				if (creatorData?.tiktokMetrics) {
					console.log(
						"tiktokMetrics structure:",
						Object.keys(creatorData.tiktokMetrics)
					);
				}
				if (creatorData?.creatorProfileData) {
					console.log(
						"creatorProfileData structure:",
						Object.keys(creatorData.creatorProfileData)
					);
					if (creatorData.creatorProfileData.tiktokMetrics) {
						console.log(
							"creatorProfileData.tiktokMetrics:",
							Object.keys(creatorData.creatorProfileData.tiktokMetrics)
						);
					}
				}
				if (creatorData?.metrics) {
					console.log("metrics structure:", Object.keys(creatorData.metrics));
				}

				// Try all possible locations with logging
				const viewsSources = [
					{
						path: "tiktokMetrics.views",
						value: creatorData?.tiktokMetrics?.views,
					},
					{
						path: "creatorProfileData.tiktokMetrics.views",
						value: creatorData?.creatorProfileData?.tiktokMetrics?.views,
					},
					{ path: "metrics.views", value: creatorData?.metrics?.views },
					{ path: "tiktok.views", value: creatorData?.tiktok?.views },
					{
						path: "socialMetrics.tiktok.views",
						value: creatorData?.socialMetrics?.tiktok?.views,
					},
					{
						path: "profile.tiktokMetrics.views",
						value: creatorData?.profile?.tiktokMetrics?.views,
					},
				];

				for (const source of viewsSources) {
					if (source.value && typeof source.value === "number") {
						console.log(`Found views at ${source.path}: ${source.value}`);
						totalViews = source.value;
						break;
					}
				}

				if (totalViews === 0) {
					console.log("No views found in any expected location");
					console.log(
						"Full creator data sample:",
						JSON.stringify(creatorData, null, 2).substring(0, 1000)
					);
				}
			} else {
				console.log("Creator document not found, checking alternative locations...");

				// Try creatorProfiles collection
				const creatorProfileDoc = await adminDb
					.collection("creatorProfiles")
					.doc(userId)
					.get();
				if (creatorProfileDoc.exists) {
					const profileData = creatorProfileDoc.data();
					console.log("Found creator profile, checking for views...");
					// Apply same logic to profile data
					if (profileData?.tiktokMetrics?.views) {
						totalViews = profileData.tiktokMetrics.views;
						console.log(`Found views in profile: ${totalViews}`);
					}
				}
			}
		} catch (error) {
			console.error("Error fetching creator metrics:", error);
		}

		// 4. IMPROVED CONTEST CALCULATION WITH BETTER ERROR HANDLING
		console.log("Fetching contest data with improved approach...");
		let contestsWon = 0;
		let contestSubmissions: {
	  contestId: string;
      isWinner: boolean; id: string; 
}[] = [];

		try {
			// Try contest_submissions first
			let contestSnapshot = await adminDb
				.collection("contest_submissions")
				.where("userId", "==", userId)
				.get();

			console.log(`Found ${contestSnapshot.size} entries in contest_submissions`);

			// If empty, try contest_applications
			if (contestSnapshot.empty) {
				console.log("Trying contest_applications...");
				contestSnapshot = await adminDb
					.collection("contest_applications")
					.where("userId", "==", userId)
					.get();
				console.log(
					`Found ${contestSnapshot.size} entries in contest_applications`
				);
			}

			contestSubmissions = contestSnapshot.docs.map((doc) => ({
				id: doc.id,
				isWinner: doc.data().isWinner || false, // Ensure isWinner is included
				contestId: doc.data().contestId || "", // Add contestId with a fallback
				...doc.data(),
			}));

			// Count wins from submissions
			contestsWon = contestSubmissions.filter((s) => s.isWinner === true).length;

			// If no wins found in submissions, check contests collection
			if (contestsWon === 0 && contestSubmissions.length > 0) {
				console.log("Checking contests collection for winner data...");
				const contestIds = [
					...new Set(contestSubmissions.map((s) => s.contestId)),
				];

				for (const contestId of contestIds) {
					try {
						const contestDoc = await adminDb
							.collection("contests")
							.doc(contestId)
							.get();
						if (contestDoc.exists) {
							const contestData = contestDoc.data();
							if (contestData?.winners?.some((w: { userId: string }) => w.userId === userId)) {
								contestsWon++;
								console.log(`Found win in contest ${contestId}`);
							}
						}
					} catch (contestError) {
						console.error(`Error checking contest ${contestId}:`, contestError);
					}
				}
			}

			console.log(`Total contests won: ${contestsWon}`);
		} catch (error) {
			console.error("Error fetching contest data:", error);
			contestSubmissions = [];
		}

		// Group submissions by contestId
		const contestsMap = new Map<string, ContestSubmission[]>();
		contestSubmissions.forEach((submission) => {
			if (!submission.contestId) return;

			if (!contestsMap.has(submission.contestId)) {
				contestsMap.set(submission.contestId, []);
			}
			contestsMap.get(submission.contestId)?.push({
				...submission,
				userId,
			});
		});

		// === FETCH PROJECT DETAILS ===
		console.log("Fetching project details...");
		const projectDetails: ProjectDetail[] = [];

		// Use accepted applications for project details
		const projectApplications = acceptedApplicationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as unknown as ProjectApplication[];

		await Promise.all(
			projectApplications.map(async (app) => {
				try {
					const projectDoc = await adminDb
						.collection("projects")
						.doc(app.projectId)
						.get();

					if (!projectDoc.exists) {
						console.log(`Project ${app.projectId} not found`);
						return;
					}

					const projectData = projectDoc.data() as ProjectData;
					console.log(`Project ${app.projectId} data:`, projectData);

					// Get submissions for this project
					const submissionsSnapshot = await adminDb
						.collection("project_submissions")
						.where("userId", "==", userId)
						.where("projectId", "==", app.projectId)
						.get();

					const approvedSubmissions = submissionsSnapshot.docs.filter(
						(doc) => (doc.data() as ProjectSubmission).status === "approved"
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
						projectName:
							projectData.projectDetails?.projectName || "Unnamed Project",
						projectThumbnail: projectData.projectDetails?.projectThumbnail,
						status: projectData.status || "unknown",
						applicationStatus: app.status,
						approvedVideos: approvedSubmissions,
						totalVideos: totalVideos,
						budgetPerVideo: budgetPerVideo,
						completionPercentage:
							totalVideos > 0 ? (approvedSubmissions / totalVideos) * 100 : 0,
					});
				} catch (error) {
					console.error(`Error processing project ${app.projectId}:`, error);
				}
			})
		);

		// === FETCH CONTEST DETAILS ===
		console.log("Fetching contest details...");
		const contestDetails: Contest[] = [];

		await Promise.all(
			Array.from(contestsMap.keys()).map(async (contestId) => {
				try {
					const contestDoc = await adminDb
						.collection("contests")
						.doc(contestId)
						.get();

					if (!contestDoc.exists) {
						console.log(`Contest ${contestId} not found`);
						return;
					}

					const contestData = contestDoc.data() as Contest;
					const submissions = contestsMap.get(contestId) || [];

					// Check if user has a winning entry
					const hasWinningEntry = submissions.some(
						(submission) => submission.isWinner
					);

					// Find the prize amount for winning entries
					let prizeAmount = 0;
					const winningSubmission = submissions.find(
						(submission) => submission.isWinner
					);
					if (winningSubmission && winningSubmission.prizeAmount) {
						prizeAmount = winningSubmission.prizeAmount;
					} else if (
						contestData.prizeTimeline?.positions?.[0] &&
						hasWinningEntry
					) {
						prizeAmount = contestData.prizeTimeline.positions[0];
					}

					const contest: Contest = {
						...contestData,
						contestId: contestId,
						userId: userId,
						applicantsCount: submissions.length,
						hasWinningEntry: hasWinningEntry,
						prizeAmount: prizeAmount,
					};

					contestDetails.push(contest);
				} catch (error) {
					console.error(`Error processing contest ${contestId}:`, error);
				}
			})
		);

		// === CALCULATE EARNINGS AND PENDING PAYMENTS ===
		console.log("Calculating earnings and pending payments...");
		let totalEarnings = 0;
		let pendingPayout = 0;

		// Calculate project earnings
		for (const project of projectDetails) {
			if (
				(project.applicationStatus === "accepted" ||
					project.applicationStatus === "approved") &&
				project.status === "completed"
			) {
				const amount = project.budgetPerVideo * project.approvedVideos;
				totalEarnings += amount;

				try {
					const projectDoc = await adminDb
						.collection("projects")
						.doc(project.projectId)
						.get();
					if (projectDoc.exists) {
						const data = projectDoc.data() as ProjectData;
						if (!data.paidfalse && data.paymentAmount === null) {
							pendingPayout += amount;
						}
					}
				} catch (error) {
					console.error(
						`Error checking payment status for project ${project.projectId}:`,
						error
					);
				}
			} else if (
				(project.applicationStatus === "accepted" ||
					project.applicationStatus === "approved") &&
				project.status === "active"
			) {
				if (project.approvedVideos > 0) {
					const amount = project.budgetPerVideo * project.approvedVideos;
					pendingPayout += amount;
					totalEarnings += amount;
				}
			}
		}

		// Calculate contest earnings
		contestDetails.forEach((contest) => {
			if (contest.hasWinningEntry && contest.prizeAmount) {
				totalEarnings += contest.prizeAmount;

				const submissions = contestsMap.get(contest.contestId) || [];
				const winningSubmission = submissions.find((s) => s.isWinner);

				if (winningSubmission && winningSubmission.paymentStatus !== "paid") {
					pendingPayout += contest.prizeAmount;
				}
			}
		});

		// 5. CALCULATE ACCURATE PROJECT COUNTS
		const activeProjects = actualProjects.filter(
			(p) => p.status === "active" && p.applicationStatus === "open"
		).length;

		const completedProjects = actualProjects.filter(
			(p) => p.status === "completed"
		).length;

		const totalProjectsParticipated = actualProjects.length; // This is more accurate than applications

		const activeContests = contestDetails.filter(
			(c) => c.status === "active"
		).length;

		// 6. UPDATED SUMMARY WITH ACCURATE DATA
		const summary = {
			totalProjectsParticipated, // More accurate than totalProjectsApplied
			acceptedProjects: actualProjects.length,
			completedProjects,
			activeProjects,
			totalSubmissions: submissionsSnapshot.size,
			approvedSubmissions: submissionsSnapshot.docs.filter((doc) =>
				doc.data().status === "approved"
			).length,
			contestsParticipated: contestSubmissions.length,
			contestsWon,
			totalViews,
		};

		console.log("=== FINAL ACCURATE SUMMARY ===");
		console.log(summary);

		return NextResponse.json({
			success: true,
			data: {
				summary,
				activeProjects,
				activeContests,
				totalProjectsParticipated,
				totalViews,
				contestsWon,
				totalEarnings,
				pendingPayout,
				projects: projectDetails.map((project) => ({
					projectId: project.projectId,
					projectName: project.projectName,
					projectThumbnail: project.projectThumbnail,
					status: project.status,
					applicationStatus: project.applicationStatus,
					approvedVideos: project.approvedVideos,
					totalVideos: project.totalVideos,
					completionPercentage: project.completionPercentage,
					budgetPerVideo: project.budgetPerVideo,
				})),
				contests: contestDetails,
			},
		});
	} catch (error) {
		console.error("Error fetching creator stats:", error);

		return NextResponse.json(
			{
				error: "Failed to fetch creator statistics",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
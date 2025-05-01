import { adminDb } from "@/config/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

// GET /api/user-projects
export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const userId = url.searchParams.get("userId");

	if (!userId) {
		return NextResponse.json({ message: "Missing userId" }, { status: 400 });
	}

	try {
		// Get all projects the user has applied to
		const appliedProjects = await getAppliedProjects(userId);

		// Get all in progress projects the user has joined
		const inProgressProjects = await getInProgressContests(userId);

		// Get all projects the user has marked as interested
		const interestedProjects = await getInterestedProjects(userId);

		// Create a map to track unique projects
		const projectMap = new Map();

		// Process applied projects
		for (const item of appliedProjects) {
			const projectId = item.projectId;
			const projectData = await getProjectDetails(projectId);
			if (projectData) {
				projectMap.set(projectId, {
					...projectData,
					status: item.status, // 'pending', 'approved', 'rejected'
					applicationId: item.id,
					applicationCreatedAt: item.createdAt,
					updatedAt: item.updatedAt,
				});
			}
		}

		// Process joined contests
		for (const item of inProgressProjects) {
			const projectId = item.projectId;
			if (!projectMap.has(projectId)) {
				const projectData = await getProjectDetails(projectId); 
				if (projectData) {
					projectMap.set(projectId, {
						...projectData,
						status: "approved",
						applicationId: item.id,
						applicationCreatedAt: item.createdAt,
					});
				}
			}
		}

		// Process interested projects (only if not already in map)
		for (const item of interestedProjects) {
			const projectId = item.projectId;
			if (!projectMap.has(projectId)) {
				const projectData = await getProjectDetails(projectId);
				if (projectData) {
					projectMap.set(projectId, {
						...projectData,
						status: "interested",
						interestId: item.interestId,
						interestCreatedAt: item.createdAt,
					});
				}
			}
		}

		// Convert map to array
		const userProjects = Array.from(projectMap.values());

		return NextResponse.json({ projects: userProjects });
	} catch (error) {
		console.error("Error fetching user projects:", error);
		return NextResponse.json(
			{ message: "Internal server error" },
			{ status: 500 }
		);
	}
}

// Helper functions
async function getAppliedProjects(userId: string) {
	const applicationsRef = adminDb.collection("project_applications");
	const snapshot = await applicationsRef.where("userId", "==", userId).get();
	return snapshot.docs.map((doc) => ({
		id: doc.id,
		projectId: doc.data().projectId,
		status: doc.data().status,
		createdAt: doc.data().createdAt,
		updatedAt: doc.data().updatedAt,
		...doc.data(),
	}));
}

async function getInProgressContests(userId: string) {
	const submissionsRef = adminDb.collection("project_applications");
	const snapshot = await submissionsRef
		.where("userId", "==", userId)
		.where("status", "==", "approved")
		.get();

	return snapshot.docs.map((doc) => ({
		id: doc.id,
		projectId: doc.data().projectId || "",
		createdAt: doc.data().createdAt,
		...doc.data(),
	}));
}

async function getInterestedProjects(userId: string) {
	const interestsRef = adminDb.collection("project_interests");
	const snapshot = await interestsRef.where("userId", "==", userId).get();
	return snapshot.docs.map((doc) => ({
		interestId: doc.id,
		projectId: doc.data().projectId,
		createdAt: doc.data().createdAt,
		...doc.data(),
	}));
}

async function getProjectDetails(projectId: string) {
	const projectRef = adminDb.collection("projects").doc(projectId);
	const doc = await projectRef.get();
	if (!doc.exists) return null;
	return { id: doc.id, ...doc.data() };
}

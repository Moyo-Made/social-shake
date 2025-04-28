import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// GET endpoint for fetching applications
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const projectId = searchParams.get("projectId");
		const applicationId = searchParams.get("applicationId");

		// If applicationId is provided, fetch a specific application
		if (applicationId) {
			const applicationDoc = await adminDb
				.collection("project_applications")
				.doc(applicationId)
				.get();

			if (!applicationDoc.exists) {
				return NextResponse.json(
					{ error: "Application not found" },
					{ status: 404 }
				);
			}

			const applicationData = {
				id: applicationDoc.id,
				...convertTimestampsToISO(applicationDoc.data() || null),
			};

			return NextResponse.json(applicationData);
		}

		// Otherwise, fetch all applications for a project
		if (!projectId) {
			return NextResponse.json(
				{ error: "Product ID is required" },
				{ status: 400 }
			);
		}

		const applicationsSnapshot = await adminDb
			.collection("project_applications")
			.where("projectId", "==", projectId)
			.orderBy("createdAt", "desc")
			.get();

		const applications = [];
		for (const doc of applicationsSnapshot.docs) {
			applications.push({
				id: doc.id,
				...convertTimestampsToISO(doc.data() || null)
			});
		}

		return NextResponse.json(applications);
	} catch (error) {
		console.error("Error fetching applications:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch applications",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}

// Helper function to convert Firestore timestamps to ISO strings
function convertTimestampsToISO(data: Record<string, unknown> | null): Record<string, unknown> | null {
	if (!data) return data;
	
	const result = { ...data };
	
	// Convert timestamp fields to ISO strings
	for (const [key, value] of Object.entries(result)) {
		if (value instanceof Timestamp) {
			result[key] = value.toDate().toISOString();
		} else if (value && typeof value === 'object' && !Array.isArray(value)) {
			// Recursively convert nested objects
			result[key] = convertTimestampsToISO(value as Record<string, unknown>);
		}
	}
	
	return result;
}

// PUT endpoint for updating application status
export async function PUT(request: NextRequest) {
	try {
	  const { searchParams } = new URL(request.url);
	  const applicationId = searchParams.get("applicationId");
  
	  if (!applicationId) {
		return NextResponse.json(
		  { error: "Application ID is required" },
		  { status: 400 }
		);
	  }
  
	  const { status } = await request.json();
  
	  if (!status || !["pending", "approved", "rejected"].includes(status)) {
		return NextResponse.json(
		  { error: "Valid status is required (pending, approved, rejected)" },
		  { status: 400 }
		);
	  }
  
	  const applicationRef = adminDb
		.collection("project_applications")
		.doc(applicationId);
  
	  const applicationDoc = await applicationRef.get();
	  if (!applicationDoc.exists) {
		return NextResponse.json(
		  { error: "Application not found" },
		  { status: 404 }
		);
	  }
  
	  // Get the application data
	  const applicationData = applicationDoc.data();
	  const projectId = applicationData?.projectId;
	  const previousStatus = applicationData?.status;
  
	  // Update the application status
	  await applicationRef.update({
		status,
		updatedAt: FieldValue.serverTimestamp(),
	  });
  
	  // If the application is being approved (and wasn't already approved)
	  if (status === "approved" && previousStatus !== "approved" && projectId) {
		// Increment the participant count on the project document
		const projectRef = adminDb.collection("projects").doc(projectId);
		
		// Use a transaction to safely update the counter
		await adminDb.runTransaction(async (transaction) => {
		  const projectDoc = await transaction.get(projectRef);
		  if (!projectDoc.exists) {
			throw new Error("Project not found");
		  }
		  
		  // Get the current metrics (or initialize if not exists)
		  const metrics = projectDoc.data()?.metrics || {};
		  const currentParticipants = metrics.participants || 0;
		  
		  // Update the metrics
		  transaction.update(projectRef, {
			'metrics.participants': currentParticipants + 1,
			// Also update applications count if this is a new application
			'metrics.applications': (metrics.applications || 0) + (previousStatus === 'pending' ? 0 : 1)
		  });
		});
	  }
	  
	  // If the application is being rejected after being previously approved
	  else if (status === "rejected" && previousStatus === "approved" && projectId) {
		// Decrement the participant count on the project document
		const projectRef = adminDb.collection("projects").doc(projectId);
		
		await adminDb.runTransaction(async (transaction) => {
		  const projectDoc = await transaction.get(projectRef);
		  if (!projectDoc.exists) {
			throw new Error("Project not found");
		  }
		  
		  // Get the current metrics
		  const metrics = projectDoc.data()?.metrics || {};
		  const currentParticipants = Math.max(0, (metrics.participants || 0) - 1);
		  
		  // Update the metrics, ensuring count doesn't go below 0
		  transaction.update(projectRef, {
			'metrics.participants': currentParticipants
		  });
		});
	  }
  
	  // Create notification for the user
	  const notificationMessage = 
		status === "approved"
		  ? "Your application has been approved! You can now participate in the projects."
		  : status === "rejected"
			? "Your application has been declined. Please check other available projects."
			: "Your application status has been updated.";
  
	  await adminDb.collection("notifications").add({
		userId: applicationData?.userId,
		message: notificationMessage,
		status: "unread",
		createdAt: FieldValue.serverTimestamp(),
		relatedTo: "project",
		projectId: projectId,
	  });
  
	  // Return the updated application with ISO format dates
	  const updatedDoc = await applicationRef.get();
	  const updatedData = {
		id: updatedDoc.id,
		...convertTimestampsToISO(updatedDoc.data() || null)
	  };
  
	  return NextResponse.json({
		success: true, 
		message: `Application ${status === "approved" ? "approved" : "rejected"} successfully`,
		application: updatedData
	  });
	} catch (error) {
	  console.error("Error updating application:", error);
	  return NextResponse.json(
		{
		  error: "Failed to update application",
		  details: error instanceof Error ? error.message : String(error),
		},
		{ status: 500 }
	  );
	}
  }
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
	try {
	  // Parse the request body
	  const body = await request.json();
	  const {
		userId,
		contestId,
		postUrl,
		applicationText,
		sampleUrls,
		hasBusinessAccount,
	  } = body;
  
	  console.log("Received application data:", {
		userId,
		contestId,
		hasData: !!body,
	  });
  
	  // Stringent validation for userId
	  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
		return NextResponse.json(
		  { 
			error: "Missing or invalid userId",
			details: "User ID must be a non-empty string"
		  },
		  { status: 400 }
		);
	  }
  
	  // Validate other required fields
	  if (!contestId || !postUrl) {
		return NextResponse.json(
		  { error: "Missing required fields" },
		  { status: 400 }
		);
	  }
  
	  // Verify the user exists in Auth system
	  if (!adminAuth) {
		throw new Error("Firebase admin auth is not initialized");
	}
	  try {
		await adminAuth.getUser(userId);
	  } catch (error) {
		console.error("Error verifying user:", error);
		return NextResponse.json(
		  {
			error: "Invalid user ID. Please sign in again.",
			details: error instanceof Error ? error.message : String(error)
		  },
		  { status: 401 }
		);
	  }
  
	  // Check if this user has already applied to this contest
	  if (!adminDb) {
		throw new Error("Firebase admin database is not initialized");
	}
	  const existingApplicationQuery = await adminDb
		.collection("contest_applications")
		.where("userId", "==", userId)
		.where("contestId", "==", contestId)
		.limit(1)
		.get();
  
	  if (!existingApplicationQuery.empty) {
		return NextResponse.json(
		  { error: "You have already applied to this contest" },
		  { status: 400 }
		);
	  }
  
	  // Rest of your code remains the same...
	  const contestRef = adminDb.collection("contests").doc(contestId);
	  const contestDoc = await contestRef.get();
  
	  if (!contestDoc.exists) {
		return NextResponse.json({ error: "Contest not found" }, { status: 404 });
	  }
  
	  const contestData = contestDoc.data();
  
	  // Check if the contest is still open
	  const now = new Date();
	  const endDate = contestData?.prizeTimeline?.endDate
		? new Date(contestData.prizeTimeline.endDate)
		: null;
  
	  if (endDate && endDate < now) {
		return NextResponse.json(
		  { error: "This contest has ended" },
		  { status: 400 }
		);
	  }
  
	  // Create the application document with guaranteed values
	  const applicationData = {
		userId: userId.trim(),  // Ensure it's not an empty string
		contestId,
		postUrl,
		applicationText: applicationText || "",
		sampleUrls: Array.isArray(sampleUrls) ? sampleUrls : [],
		hasBusinessAccount: hasBusinessAccount === true,
		status: "pending",
		createdAt: FieldValue.serverTimestamp(),
		updatedAt: FieldValue.serverTimestamp(),
	  };
  
	  // Create the application document
	  const applicationRef = adminDb.collection("contest_applications").doc();
	  await applicationRef.set(applicationData);
  
	  // Update contest applicants count
	  await contestRef.update({
		applicantsCount: FieldValue.increment(1),
	  });
  
	  // Create notifications...
	  await adminDb.collection("notifications").add({
		userId: userId.trim(),
		message: "Your application has been submitted for review. We'll notify you once it's approved.",
		status: "unread",
		type: "contest_application",
		createdAt: FieldValue.serverTimestamp(),
		relatedTo: "contest",
		contestId,
	  });
  
	  // Only create admin notification if contestData.createdBy exists
	  if (contestData?.createdBy) {
		await adminDb.collection("notifications").add({
		  userId: contestData.createdBy,
		  message: `New application received for contest: ${contestData?.basic?.contestName || contestId}`,
		  status: "unread",
		  type: "new_application",
		  createdAt: FieldValue.serverTimestamp(),
		  relatedTo: "contest",
		  contestId,
		  applicationId: applicationRef.id,
		});
	  }
  
	  return NextResponse.json({
		success: true,
		message: "Application submitted successfully. It will be reviewed by the brand.",
		applicationId: applicationRef.id,
	  });
	} catch (error) {
	  console.error("Error submitting contest application:", error);
	  return NextResponse.json(
		{
		  error: "Failed to submit application",
		  details: error instanceof Error ? error.message : String(error),
		},
		{ status: 500 }
	  );
	}
  }
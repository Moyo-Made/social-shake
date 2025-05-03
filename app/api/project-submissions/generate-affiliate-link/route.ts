import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";

/**
 * Generates an affiliate link while preserving any existing UTM parameters
 * and adding the creator and video specific tracking parameters
 */
function generateAffiliateLink(productLink: string, userId: string, submissionId: string): string {
  if (!productLink) return "https://brandwebsite.com/product?utm_source=socialshake&utm_campaign=creator"+userId+"_video"+submissionId.substring(0, 6);
  
  try {
    // Add protocol if missing
    const urlWithProtocol = productLink.startsWith('http') ? productLink : `https://${productLink}`;
    
    // Parse the URL
    const url = new URL(urlWithProtocol);
    
    // Preserve existing query parameters
    const params = url.searchParams;
    
    // Add our tracking parameters (overwrite if they exist)
    params.set('utm_source', 'socialshake');
    params.set('utm_campaign', `creator${userId}_video${submissionId.substring(0, 6)}`);
    
    // Optional: Add medium if not present
    if (!params.has('utm_medium')) {
      params.set('utm_medium', 'social');
    }
    
    // Return the complete URL with all parameters
    return url.toString();
  } catch (error) {
    console.error("Error generating affiliate link:", error);
    
    // Fallback method if URL parsing fails
    const baseUrl = productLink.split('?')[0];
    return `${baseUrl}?utm_source=socialshake&utm_campaign=creator${userId}_video${submissionId.substring(0, 6)}`;
  }
}

// Handler for both GET and POST requests
export async function GET(request: NextRequest) {
  try {
    // Get submissionId from URL query parameters
    const { searchParams } = new URL(request.url);
    const submissionId = searchParams.get('submissionId');

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: "Missing submission ID" },
        { status: 400 }
      );
    }

    // Fetch the submission from Firestore
    const submissionRef = adminDb.collection("project_submissions").doc(submissionId);
    const submissionDoc = await submissionRef.get();

    if (!submissionDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    const submission = submissionDoc.data();
    
    // Check if the submission already has an affiliate link
    if (submission?.affiliateLink) {
      return NextResponse.json({
        success: true,
        data: {
          submissionId,
          affiliateLink: submission.affiliateLink
        }
      });
    } else {
      // If no affiliate link exists, return appropriate response
      return NextResponse.json({
        success: false,
        error: "No affiliate link exists for this submission"
      }, { status: 404 });
    }
  } catch (error) {
    console.error("Error fetching affiliate link:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch affiliate link",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the JSON data from the request
    const data = await request.json();
    const { submissionId } = data;

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: "Missing submission ID" },
        { status: 400 }
      );
    }

    // Fetch the submission from Firestore
    const submissionRef = adminDb.collection("project_submissions").doc(submissionId);
    const submissionDoc = await submissionRef.get();

    if (!submissionDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      );
    }

    const submission = submissionDoc.data();
    
    // If the submission already has an affiliate link, return it without regenerating
    if (submission?.affiliateLink) {
      return NextResponse.json({
        success: true,
        data: {
          submissionId,
          affiliateLink: submission.affiliateLink
        }
      });
    }
    
    // Check if we have the necessary data to generate a link
    if (!submission?.projectId || !submission?.userId) {
      return NextResponse.json(
        { success: false, error: "Missing project or user information" },
        { status: 400 }
      );
    }

    // Fetch the project to get the product URL
    const projectRef = adminDb.collection("projects").doc(submission.projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }
    
    const project = projectDoc.data();
    
    // Get the product URL from the project data
    // Look for it in different possible locations based on your data structure
    const productLink = project?.projectDetails?.productLink || 
                      "https://brandwebsite.com/product";
    
    // Generate the affiliate link with proper UTM parameters
    const affiliateLink = generateAffiliateLink(
      productLink,
      submission.userId,
      submissionId
    );
    
    // Update the submission with the affiliate link
    await submissionRef.update({
      affiliateLink: affiliateLink,
      updatedAt: new Date().toISOString()
    });

    // Return the affiliate link
    return NextResponse.json({
      success: true,
      data: {
        submissionId,
        affiliateLink: affiliateLink
      }
    });
    
  } catch (error) {
    console.error("Error generating affiliate link:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to generate affiliate link",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
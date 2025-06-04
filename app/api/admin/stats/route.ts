import { NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { BrandStatus } from "@/types/user";
import { ProjectStatus } from "@/types/projects";
import { ContestStatus } from "@/types/projects";

export async function GET() {
  try {
    if (!adminDb) {
      throw new Error("Firebase admin database is not initialized");
    }

    // Get total brands count
    const brandProfilesSnapshot = await adminDb.collection("brandProfiles").count().get();
    const totalBrands = brandProfilesSnapshot.data().count;

    // Get pending brands count
    const pendingBrandsSnapshot = await adminDb.collection("brandProfiles")
      .where("status", "==", BrandStatus.PENDING)
      .count()
      .get();
    const pendingBrands = pendingBrandsSnapshot.data().count;

    // Get total creators count using the same logic as the creators endpoint
    // This ensures consistency between admin stats and creator listing
    const allVerificationsSnapshot = await adminDb.collection("creator_verifications").get();
    
    // Group by email/userId to get unique creators (same logic as creators endpoint)
    const creatorGroups = new Map();
    allVerificationsSnapshot.docs.forEach(doc => {
      const verificationData = doc.data();
      const userId = verificationData.userId;
      const email = verificationData.profileData?.email || verificationData.email;
      const groupKey = email || userId;
      
      if (groupKey && !creatorGroups.has(groupKey)) {
        creatorGroups.set(groupKey, true);
      }
    });
    
    const totalCreators = creatorGroups.size;

    // Get pending creators count
    const pendingCreatorsSnapshot = await adminDb.collection("creator_verifications")
      .where("status", "==", "pending")
      .count()
      .get();
    const pendingCreators = pendingCreatorsSnapshot.data().count;

    // Get active projects count
    const activeProjectsSnapshot = await adminDb.collection("projects")
      .where("status", "==", ProjectStatus.ACTIVE)
      .count()
      .get();
    const activeProjects = activeProjectsSnapshot.data().count;

    // Get pending projects count
    const pendingProjectsSnapshot = await adminDb.collection("projects")
      .where("status", "==", ProjectStatus.PENDING)
      .count()
      .get();
    const pendingProjects = pendingProjectsSnapshot.data().count;

    // Get active contests count
    const activeContestsSnapshot = await adminDb.collection("contests")
      .where("status", "==", ContestStatus.ACTIVE)
      .count()
      .get();
    const activeContests = activeContestsSnapshot.data().count;

    // Get pending contests count
    const pendingContestsSnapshot = await adminDb.collection("contests")
      .where("status", "==", ContestStatus.PENDING)
      .count()
      .get();
    const pendingContests = pendingContestsSnapshot.data().count;

    // Get pending payouts count (assuming you have a payouts collection)
    let pendingPayouts = 0;
    try {
      const payoutsSnapshot = await adminDb.collection("payouts")
        .where("status", "==", "pending")
        .count()
        .get();
      pendingPayouts = payoutsSnapshot.data().count;
    } catch (err) {
      console.log("Error fetching payouts or collection might not exist:", err);
      // Just continue with 0 if the collection doesn't exist
    }

    // Calculate total revenue (this is a placeholder - implement your actual revenue calculation)
    // For demonstration, we'll fetch the last few transactions and sum them
    let totalRevenue = 0;
    try {
      const transactionsSnapshot = await adminDb.collection("transactions")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
      
      transactionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.amount) {
          totalRevenue += parseFloat(data.amount);
        }
      });
    } catch (err) {
      console.log("Error fetching transactions or collection might not exist:", err);
    }

    // Get recent activities
    const recentActivities: { id: string; type: string; action: string; name: string; time: string; rawTime: Date; }[] = [];

    // Brand registrations (last 5)
    const recentBrandsSnapshot = await adminDb.collection("brandProfiles")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    
    recentBrandsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Safely handle timestamp conversion
      const timestamp = safeGetTimestamp(data.createdAt);
      
      if (timestamp) {
        recentActivities.push({
          id: doc.id,
          type: "User",
          action: "New brand registration",
          name: data.brandName || "Unnamed Brand",
          time: timestamp.toISOString(),
          rawTime: timestamp
        });
      }
    });

    // Creator registrations (last 5)
    const recentCreatorsSnapshot = await adminDb.collection("creatorProfiles")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    
    recentCreatorsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Safely handle timestamp conversion
      const timestamp = safeGetTimestamp(data.createdAt);
      
      if (timestamp) {
        const profileData = data || {};
        const name = profileData.firstName && profileData.lastName ? 
          `${profileData.firstName} ${profileData.lastName}` : "Unnamed Creator";
        
        recentActivities.push({
          id: doc.id,
          type: "User",
          action: "New creator registration",
          name: name,
          time: timestamp.toISOString(),
          rawTime: timestamp
        });
      }
    });

    // Recent contests (last 5)
    const recentContestsSnapshot = await adminDb.collection("contests")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    
    recentContestsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Safely handle timestamp conversion
      const timestamp = safeGetTimestamp(data.createdAt);
      
      if (timestamp) {
        const contestDetails = data.basic || {};
        
        recentActivities.push({
          id: doc.id,
          type: "Contest",
          action: "New contest created",
          name: contestDetails.contestName || "Unnamed Contest",
          time: timestamp.toISOString(),
          rawTime: timestamp
        });
      }
    });

    // Recent projects (last 5)
    const recentProjectsSnapshot = await adminDb.collection("projects")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();
    
    recentProjectsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Safely handle timestamp conversion
      const timestamp = safeGetTimestamp(data.createdAt);
      
      if (timestamp) {
        const projectDetails = data.projectDetails || {};
        
        recentActivities.push({
          id: doc.id,
          type: "Project",
          action: "New project created",
          name: projectDetails.projectName || "Unnamed Project",
          time: timestamp.toISOString(),
          rawTime: timestamp
        });
      }
    });

    // Sort all activities by time (newest first)
    recentActivities.sort((a, b) => {
      return b.rawTime.getTime() - a.rawTime.getTime();
    });

    // Take only the 10 most recent activities
    const limitedActivities = recentActivities.slice(0, 10);

    // Format the timestamps to human-readable format
    const now = new Date();
    const formattedActivities = limitedActivities.map(activity => {
      const activityDate = activity.rawTime;
      const diffMs = now.getTime() - activityDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let formattedTime;
      if (diffMins < 1) {
        formattedTime = "Just now";
      } else if (diffMins < 60) {
        formattedTime = `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
      } else if (diffHours < 24) {
        formattedTime = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
      } else {
        formattedTime = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
      }

      // Return a clean object without the rawTime property
      return {
        id: activity.id,
        type: activity.type,
        action: activity.action,
        name: activity.name,
        time: formattedTime
      };
    });

    // Build the response with separate brand and creator counts
    const stats = {
      totalUsers: totalBrands + totalCreators,
      totalBrands,
      totalCreators,
      pendingBrands,
      pendingCreators,
      activeProjects,
      pendingProjects,
      activeContests,
      pendingContests,
      pendingPayouts,
      totalRevenue: totalRevenue.toFixed(2),
      recentActivities: formattedActivities
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch admin stats";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Safely converts a Firestore timestamp or date string to a JavaScript Date object
 * @param {any} timestamp - The timestamp from Firestore (could be a Firestore.Timestamp, Date, ISO string, etc.)
 * @returns {Date|null} - JavaScript Date object or null if conversion fails
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeGetTimestamp(timestamp: any) {
  try {
    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // If it's a Firestore Timestamp object (has seconds and nanoseconds)
    if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
      return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    }
    
    // If it's a string representation of a date (ISO format)
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      // Check if the date is valid
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // If it's a number (milliseconds since epoch)
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    // If none of the above conversions worked, return null
    console.log("Could not convert timestamp:", timestamp);
    return null;
  } catch (error) {
    console.error("Error converting timestamp:", error, timestamp);
    return null;
  }
}
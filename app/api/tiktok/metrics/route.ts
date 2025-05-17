/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

interface TiktokMetrics {
  followers: null | { 
    count: number | null; 
    insights: any | null 
  };
  videos: null | { 
    count: number; 
    recentVideos: Array<{
      id: string;
      createTime: number;
      coverImageUrl: string;
      shareUrl: string;
      title: string;
      description: string;
      statistics: any;
    }>;
  };
  engagement: null | { 
    rate: number; 
    averageLikes: number; 
    averageComments: number; 
    averageShares: number; 
    averageViews: number;
  };
  views: null | number;
  likes: null | number;
  comments: null | number;
  shares: null | number;
}

interface TotalMetrics {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  count: number;
}

/**
 * Endpoint to fetch and update TikTok metrics for a creator
 * This can be triggered manually or via a scheduled job
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();
    
    if (!userId && !email) {
      return NextResponse.json(
        { error: "Either userId or email is required" },
        { status: 400 }
      );
    }
    
    // Get the TikTok profile data
    const tiktokProfileDoc = await getTiktokProfileDoc(userId, email);
    
    if (!tiktokProfileDoc) {
      return NextResponse.json(
        { error: "TikTok profile not found" },
        { status: 404 }
      );
    }
    
    const tiktokProfile = tiktokProfileDoc.data();
    const accessToken = tiktokProfile?.accessToken;
    // const tiktokId = tiktokProfile?.tiktokId;
    const actualUserId = tiktokProfile?.userId;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token not found" },
        { status: 400 }
      );
    }
    
    // Fetch metrics data
    const metrics = await fetchTiktokMetrics(tiktokProfile, accessToken);
    
    // Update both collections with new metrics
    await updateMetricsInDatabase(tiktokProfileDoc, metrics, actualUserId);
    
    return NextResponse.json({
      success: true,
      message: "TikTok metrics updated successfully",
      metrics: metrics
    });
    
  } catch (error) {
    console.error("Error in TikTok metrics endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Gets the TikTok profile document from Firestore
 */
async function getTiktokProfileDoc(userId?: string, email?: string) {
  if (userId) {
    const tiktokProfileRef = adminDb.collection("tiktokProfiles").doc(userId);
    const doc = await tiktokProfileRef.get();
    
    if (doc.exists) {
      return doc;
    }
    return null;
  } else if (email) {
    const snapshot = await adminDb
      .collection("tiktokProfiles")
      .where("email", "==", email)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      return snapshot.docs[0];
    }
    return null;
  }
  
  return null;
}

/**
 * Fetches all TikTok metrics based on available scopes
 */
async function fetchTiktokMetrics(tiktokProfile: any, accessToken: string): Promise<TiktokMetrics> {
  const metrics: TiktokMetrics = {
    followers: null,
    videos: null,
    engagement: null,
    views: null,
    likes: null,
    comments: null,
    shares: null
  };
  
  try {
    // Fetch follower metrics if we have permission
    if (tiktokProfile.scope && tiktokProfile.scope.includes("followers.read")) {
      await fetchFollowerMetrics(accessToken, metrics);
    }
    
    // Fetch video metrics if we have permission
    if (tiktokProfile.scope && tiktokProfile.scope.includes("video.read")) {
      await fetchVideoMetrics(accessToken, metrics);
    }
    
    return metrics;
  } catch (error) {
    console.error("Error fetching TikTok metrics:", error);
    throw error;
  }
}

/**
 * Fetches follower metrics from TikTok API
 */
async function fetchFollowerMetrics(accessToken: string, metrics: TiktokMetrics): Promise<void> {
  try {
    const followerResponse = await fetch(
      "https://open.tiktokapis.com/v2/research/user/followers/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          fields: ["follower_count", "follower_insights"]
        })
      }
    );
    
    if (followerResponse.ok) {
      const followerData = await followerResponse.json();
      
      if (followerData.data) {
        metrics.followers = {
          count: followerData.data.follower_count || null,
          insights: followerData.data.follower_insights || null
        };
      }
    } else {
      console.warn("Failed to fetch follower metrics:", await followerResponse.text());
    }
  } catch (error) {
    console.error("Error fetching follower metrics:", error);
  }
}

/**
 * Fetches video metrics from TikTok API
 */
async function fetchVideoMetrics(accessToken: string, metrics: TiktokMetrics): Promise<void> {
  try {
    const videoResponse = await fetch(
      "https://open.tiktokapis.com/v2/video/list/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          max_count: 20, // Fetch up to 20 videos
          fields: [
            "id", "create_time", "cover_image_url", "share_url", "title", "video_description",
            "statistics.comment_count", "statistics.like_count", "statistics.share_count", "statistics.view_count"
          ]
        })
      }
    );
    
    if (videoResponse.ok) {
      const videoData = await videoResponse.json();
      
      if (videoData.data && videoData.data.videos) {
        const videos = videoData.data.videos;
        
        // Calculate total and average metrics
        const totalMetrics = calculateTotalMetrics(videos);
        
        // Store video metrics
        metrics.videos = {
          count: videos.length,
          recentVideos: videos.slice(0, 5).map(formatVideoData)
        };
        
        // Store engagement metrics
        if (totalMetrics.count > 0) {
          metrics.likes = totalMetrics.likes;
          metrics.comments = totalMetrics.comments;
          metrics.shares = totalMetrics.shares;
          metrics.views = totalMetrics.views;
          
          // Calculate engagement rate if we have views
          if (totalMetrics.views > 0) {
            metrics.engagement = calculateEngagementRate(totalMetrics);
          }
        }
      }
    } else {
      console.warn("Failed to fetch video metrics:", await videoResponse.text());
    }
  } catch (error) {
    console.error("Error fetching video metrics:", error);
  }
}

/**
 * Calculates total metrics from video data
 */
function calculateTotalMetrics(videos: any[]): TotalMetrics {
  return videos.reduce((acc: TotalMetrics, video: any) => {
    if (video.statistics) {
      acc.likes += video.statistics.like_count || 0;
      acc.comments += video.statistics.comment_count || 0;
      acc.shares += video.statistics.share_count || 0;
      acc.views += video.statistics.view_count || 0;
      acc.count++;
    }
    return acc;
  }, { likes: 0, comments: 0, shares: 0, views: 0, count: 0 });
}

/**
 * Formats video data for storage
 */
function formatVideoData(video: any) {
  return {
    id: video.id,
    createTime: video.create_time,
    coverImageUrl: video.cover_image_url,
    shareUrl: video.share_url,
    title: video.title,
    description: video.video_description,
    statistics: video.statistics
  };
}

/**
 * Calculates engagement rate metrics
 */
function calculateEngagementRate(totalMetrics: TotalMetrics) {
  return {
    rate: ((totalMetrics.likes + totalMetrics.comments + totalMetrics.shares) / totalMetrics.views) * 100,
    averageLikes: totalMetrics.likes / totalMetrics.count,
    averageComments: totalMetrics.comments / totalMetrics.count,
    averageShares: totalMetrics.shares / totalMetrics.count,
    averageViews: totalMetrics.views / totalMetrics.count
  };
}

/**
 * Updates metrics in both tiktokProfiles and creatorProfiles collections
 */
async function updateMetricsInDatabase(
  tiktokProfileDoc: FirebaseFirestore.DocumentSnapshot, 
  metrics: TiktokMetrics, 
  userId: string
) {
  try {
    const batch = adminDb.batch();
    
    // Update metrics in tiktokProfiles collection
    batch.update(tiktokProfileDoc.ref, {
      metrics: metrics,
      lastMetricsUpdate: FieldValue.serverTimestamp()
    });
    
    // Find and update the creator profile if it exists
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const userEmail = userData?.email;
    
    if (userEmail) {
      const creatorProfileRef = adminDb.collection("creatorProfiles").doc(userEmail);
      const creatorDoc = await creatorProfileRef.get();
      
      if (creatorDoc.exists) {
        batch.update(creatorProfileRef, {
          tiktokMetrics: metrics,
          tiktokFollowerCount: metrics.followers?.count || null,
          tiktokEngagementRate: metrics.engagement?.rate || null,
          tiktokLastMetricsUpdate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
    
    // Commit the batch operation
    await batch.commit();
  } catch (error) {
    console.error("Error updating metrics in database:", error);
    throw error;
  }
}
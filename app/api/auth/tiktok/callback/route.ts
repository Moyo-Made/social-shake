/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/config/firebase-admin";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { clearStateSession, verifyStateSession, getUserIdFromState } from "@/utils/sessionStore";

export async function GET(req: NextRequest) {
  // Get state from URL params
  const state = req.nextUrl.searchParams.get("state");
  console.log(`Received state in URL: ${state}`);

  // Verify state using the Firestore session store
  if (!state || !(await verifyStateSession(state))) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/creator/dashboard?toast=error&message=${encodeURIComponent("Invalid or expired state parameter")}`
    );
  }

  // Get the user ID from the state (retrieved from session store)
  const userId = await getUserIdFromState(state);
  if (!userId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/creator/dashboard?toast=error&message=${encodeURIComponent("Could not retrieve user ID from state")}`
    );
  }

  // Clear the state from the session
  await clearStateSession(state);
  
  try {
    // Exchange code for access token
    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      throw new Error("Missing code parameter in callback URL");
    }

    const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
    const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
    const REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

    if (!CLIENT_KEY || !CLIENT_SECRET || !REDIRECT_URI || !code) {
      throw new Error("Missing required configuration or code parameter");
    }

    const tokenResponse = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_key: CLIENT_KEY,
          client_secret: CLIENT_SECRET,
          code: code,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI, // Use the EXACT same redirect URI registered with TikTok
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    console.log("Token response status:", tokenResponse.status);
    console.log("Token data:", JSON.stringify(tokenData, null, 2));

    if (!tokenResponse.ok) {
      throw new Error(
        `Failed to exchange code for token: ${JSON.stringify(tokenData)}`
      );
    }

    // Get user info with the access token
    const userResponse = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,username,profile_deep_link",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
      }
    );

    const userData = await userResponse.json();
    console.log("TikTok API user response status:", userResponse.status);
    console.log("TikTok API user response:", JSON.stringify(userData, null, 2));

    if (!userResponse.ok) {
      throw new Error(
        `TikTok API error (${userResponse.status}): ${JSON.stringify(userData)}`
      );
    }

    // Extract user data with more fields
    let tiktokId = tokenData.open_id; // Fallback to token response data
    let displayName = null;
    let avatarUrl = null;
    let username = null;
    let profileLink = null;

    // Try to get more user data from the user info response if available
    if (userData.data?.user?.open_id) {
      tiktokId = userData.data.user.open_id;
      displayName = userData.data.user.display_name || null;
      avatarUrl = userData.data.user.avatar_url || null;
      username = userData.data.user.username || null;
      profileLink = userData.data.user.profile_deep_link || null;
    }

    if (!tiktokId) {
      throw new Error("Could not determine TikTok user ID");
    }
    
    // Get TikTok metrics data
    console.log("Fetching TikTok metrics for user:", tiktokId);
    
    // Fetch follower metrics
    const metrics: {
      followers: { count: any; insights: any } | null;
      videos: any;
      engagement: any;
      views: any;
      likes: any;
      comments: any;
      shares: any;
    } = {
      followers: null,
      videos: null,
      engagement: null,
      views: null,
      likes: null,
      comments: null,
      shares: null
    };
    
    try {
      // Fetch follower metrics (requires followers.read scope)
      if (tokenData.scope.includes("followers.read")) {
        const followerResponse = await fetch(
          "https://open.tiktokapis.com/v2/research/user/followers/",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              "Content-Type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify({
              fields: ["follower_count", "follower_insights"]
            })
          }
        );
        
        if (followerResponse.ok) {
          const followerData = await followerResponse.json();
          console.log("TikTok follower metrics:", JSON.stringify(followerData, null, 2));
          
          if (followerData.data) {
            metrics.followers = {
              count: followerData.data.follower_count || null,
              insights: followerData.data.follower_insights || null
            };
          }
        } else {
          console.warn("Failed to fetch follower metrics:", await followerResponse.text());
        }
      } else {
        console.log("No followers.read scope permission, skipping follower metrics");
      }
      
      // Fetch video metrics (requires video.read scope)
      if (tokenData.scope.includes("video.read")) {
        const videoResponse = await fetch(
          "https://open.tiktokapis.com/v2/video/list/",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              "Content-Type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify({
              max_count: 20, // Fetch up to 20 videos
              fields: ["id", "create_time", "cover_image_url", "share_url", "title", "video_description",
                       "statistics.comment_count", "statistics.like_count", "statistics.share_count", "statistics.view_count"]
            })
          }
        );
        
        if (videoResponse.ok) {
          const videoData = await videoResponse.json();
          console.log("TikTok video metrics:", JSON.stringify(videoData, null, 2));
          
          if (videoData.data && videoData.data.videos) {
            // Calculate total and average metrics
            const videos = videoData.data.videos;
            const totalMetrics = videos.reduce((acc: { likes: any; comments: any; shares: any; views: any; count: number; }, video: { statistics: { like_count: any; comment_count: any; share_count: any; view_count: any; }; }) => {
              if (video.statistics) {
                acc.likes += video.statistics.like_count || 0;
                acc.comments += video.statistics.comment_count || 0;
                acc.shares += video.statistics.share_count || 0;
                acc.views += video.statistics.view_count || 0;
                acc.count++;
              }
              return acc;
            }, { likes: 0, comments: 0, shares: 0, views: 0, count: 0 });
            
            // Store video metrics
			interface VideoStatistics {
			  comment_count: number;
			  like_count: number;
			  share_count: number;
			  view_count: number;
			}

			interface Video {
			  id: string;
			  create_time: number;
			  cover_image_url: string;
			  share_url: string;
			  title: string;
			  video_description: string;
			  statistics: VideoStatistics;
			}

			interface VideoMetrics {
			  count: number;
			  recentVideos: {
				id: string;
				createTime: number;
				coverImageUrl: string;
				shareUrl: string;
				title: string;
				description: string;
				statistics: VideoStatistics;
			  }[];
			}

			metrics.videos = {
			  count: videos.length,
			  recentVideos: videos.slice(0, 5).map((v: Video) => ({
				id: v.id,
				createTime: v.create_time,
				coverImageUrl: v.cover_image_url,
				shareUrl: v.share_url,
				title: v.title,
				description: v.video_description,
				statistics: v.statistics
			  }))
			} as VideoMetrics;
            
            // Store engagement metrics
            if (totalMetrics.count > 0) {
              metrics.likes = totalMetrics.likes;
              metrics.comments = totalMetrics.comments;
              metrics.shares = totalMetrics.shares;
              metrics.views = totalMetrics.views;
              
              // Calculate engagement rate (likes + comments + shares) / views
              if (totalMetrics.views > 0) {
                metrics.engagement = {
                  rate: ((totalMetrics.likes + totalMetrics.comments + totalMetrics.shares) / totalMetrics.views) * 100,
                  averageLikes: totalMetrics.likes / totalMetrics.count,
                  averageComments: totalMetrics.comments / totalMetrics.count,
                  averageShares: totalMetrics.shares / totalMetrics.count,
                  averageViews: totalMetrics.views / totalMetrics.count
                };
              }
            }
          }
        } else {
          console.warn("Failed to fetch video metrics:", await videoResponse.text());
        }
      } else {
        console.log("No video.read scope permission, skipping video metrics");
      }
    } catch (metricsError) {
      console.error("Error fetching TikTok metrics:", metricsError);
      // Continue with the flow even if metrics fetch fails
    }

    try {
      // Start a batch to ensure data consistency across collections
      const batch = adminDb.batch();
      
      // 1. Store sensitive auth data in tiktokProfiles collection
      const tiktokProfileRef = adminDb.collection("tiktokProfiles").doc(userId);
      batch.set(tiktokProfileRef, {
        userId,
        tiktokId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        scope: tokenData.scope,
        expiresIn: tokenData.expires_in,
        tokenType: tokenData.token_type,
        connectedAt: FieldValue.serverTimestamp(),
        lastMetricsUpdate: FieldValue.serverTimestamp(),
        metrics: metrics // Store metrics in the auth profile for historical tracking
      });
      
      // 2. Update user document with flag
      const userRef = adminDb.collection("users").doc(userId);
      batch.update(userRef, {
        tiktokConnected: true,
        tiktokId,
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      // 3. Get the user email to update creatorProfile
      const userDoc = await userRef.get();
      const userData = userDoc.data();
      const userEmail = userData?.email;
      
      if (userEmail) {
        // 4. Update the public profile info in creatorProfiles collection
        const creatorProfileRef = adminDb.collection("creatorProfiles").doc(userEmail);
        const creatorDoc = await creatorProfileRef.get();
        
        if (creatorDoc.exists) {
          // Update existing creator profile
          batch.update(creatorProfileRef, {
            tiktokId,
            tiktokUsername: username,
            tiktokDisplayName: displayName,
            tiktokAvatarUrl: avatarUrl,
            tiktokProfileLink: profileLink,
            tiktokConnected: true,
            tiktokMetrics: metrics,
            tiktokFollowerCount: metrics.followers?.count || null,
            tiktokEngagementRate: metrics.engagement?.rate || null,
            updatedAt: new Date().toISOString(),
          });
        } else {
          // Create new creator profile if it doesn't exist
          batch.set(creatorProfileRef, {
            email: userEmail,
            userId,
            userType: "creator",
            tiktokId,
            tiktokUsername: username,
            tiktokDisplayName: displayName, 
            tiktokAvatarUrl: avatarUrl,
            tiktokProfileLink: profileLink,
            tiktokConnected: true,
            tiktokMetrics: metrics,
            tiktokFollowerCount: metrics.followers?.count || null,
            tiktokEngagementRate: metrics.engagement?.rate || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        console.warn("Could not find user email for creator profile update");
      }
      
      // Commit the batch operation
      await batch.commit();
      
      console.log("TikTok profile successfully connected for user:", userId);
      
      // Redirect back to dashboard with success toast parameter
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/creator/dashboard?toast=success&message=${encodeURIComponent("TikTok account successfully connected")}`
      );
      
    } catch (firestoreError) {
      console.error("Error storing TikTok profile data:", firestoreError);
      const errorMessage = firestoreError instanceof Error ? firestoreError.message : "Unknown error";
      throw new Error(`Firestore operation failed: ${errorMessage}`);
    }
  } catch (error) {
    console.error("TikTok connection error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/creator/dashboard?toast=error&message=${encodeURIComponent(errorMessage)}`
    );
  }
}
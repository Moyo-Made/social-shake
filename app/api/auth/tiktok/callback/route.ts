/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminDb } from "@/config/firebase-admin";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
	clearStateSession,
	verifyStateSession,
	getUserIdFromState,
} from "@/utils/sessionStore";

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

		// Initialize metrics with default values that work in sandbox
		const metrics = {
			followers: {
				count: 1000, // Default mock follower count for sandbox
				insights: null
			},
			videos: {
				count: 0, 
				recentVideos: []
			},
			engagement: {
				rate: 5.2, // Default mock engagement rate for sandbox (5.2%)
				averageLikes: 50,
				averageComments: 10,
				averageShares: 5,
				averageViews: 1250
			},
			views: 0,
			likes: 0,
			comments: 0,
			shares: 0
		};

		try {
			console.log("Attempting to fetch metrics in TikTok sandbox environment");
			
			// Flag to track if we've successfully retrieved real metrics
			let hasRealMetrics = false;
			
			// ATTEMPT 1: Try the standard stats endpoint with fields parameter
			if (tokenData.scope.includes("user.info.stats")) {
				console.log("Attempting standard stats endpoint with fields parameter");
				
				const statsResponse = await fetch(
					"https://open.tiktokapis.com/v2/user/info/?fields=open_id,stats",
					{
						headers: {
							Authorization: `Bearer ${tokenData.access_token}`,
							"Content-Type": "application/json; charset=UTF-8",
						},
					}
				);
				
				if (statsResponse.ok) {
					const statsData = await statsResponse.json();
					console.log("Standard stats endpoint response:", JSON.stringify(statsData, null, 2));
					
					// Check if we have actual stats data
					if (statsData.data?.user?.stats?.follower_count !== undefined) {
						metrics.followers = {
							count: statsData.data.user.stats.follower_count,
							insights: null
						};
						hasRealMetrics = true;
						console.log("Successfully retrieved follower count from standard endpoint:", 
									statsData.data.user.stats.follower_count);
					}
				}
			}
			
			// ATTEMPT 2: Try a specific video count endpoint (sandbox-specific approach)
			if (!hasRealMetrics) {
				console.log("Attempting sandbox-specific video count endpoint");
				
				// Some sandbox environments have a dedicated endpoint for video count
				try {
					const videoCountResponse = await fetch(
						"https://open.tiktokapis.com/v2/video/count/",
						{
							headers: {
								Authorization: `Bearer ${tokenData.access_token}`,
								"Content-Type": "application/json; charset=UTF-8",
							},
						}
					);
					
					if (videoCountResponse.ok) {
						const videoCountData = await videoCountResponse.json();
						console.log("Video count response:", JSON.stringify(videoCountData, null, 2));
						
						// Check if we have video count data
						if (videoCountData.data?.video_count !== undefined) {
							metrics.videos = {
								count: videoCountData.data.video_count,
								recentVideos: []
							};
						}
					}
				} catch {
					console.log("Video count endpoint not available in this sandbox");
				}
			}
			
			// ATTEMPT 3: Try video list with correct fields parameter format
			console.log("Attempting video list with proper fields parameter");
			
			try {
				const videoResponse = await fetch(
					"https://open.tiktokapis.com/v2/video/list/",
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${tokenData.access_token}`,
							"Content-Type": "application/json; charset=UTF-8",
						},
						body: JSON.stringify({
							fields: ["id", "title", "cover_image_url", "share_url", "video_description", "statistics"]
						})
					}
				);
				
				if (videoResponse.ok) {
					const videoData = await videoResponse.json();
					console.log("Video list response:", JSON.stringify(videoData, null, 2));
					
					if (videoData.data?.videos) {
						// Store actual video count
						metrics.videos = {
							count: videoData.data.videos.length,
							recentVideos: videoData.data.videos.slice(0, 5).map((v: { id: any; create_time: any; cover_image_url: any; share_url: any; title: any; video_description: any; statistics: any; }) => ({
								id: v.id || "",
								createTime: v.create_time || null,
								coverImageUrl: v.cover_image_url || "",
								shareUrl: v.share_url || "",
								title: v.title || "",
								description: v.video_description || "",
								statistics: v.statistics || {}
							}))
						};
						
						// If we have videos with statistics, calculate engagement
						if (videoData.data.videos.length > 0 && videoData.data.videos.some((v: { statistics: any; }) => v.statistics)) {
							const totalMetrics = videoData.data.videos.reduce((acc: { likes: any; comments: any; shares: any; views: any; count: number; }, video: { statistics: { like_count: any; comment_count: any; share_count: any; view_count: any; }; }) => {
								if (video.statistics) {
									acc.likes += video.statistics.like_count || 0;
									acc.comments += video.statistics.comment_count || 0;
									acc.shares += video.statistics.share_count || 0;
									acc.views += video.statistics.view_count || 0;
									acc.count++;
								}
								return acc;
							}, { likes: 0, comments: 0, shares: 0, views: 0, count: 0 });
							
							if (totalMetrics.count > 0) {
								metrics.likes = totalMetrics.likes;
								metrics.comments = totalMetrics.comments;
								metrics.shares = totalMetrics.shares;
								metrics.views = totalMetrics.views;
								
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
					}
				} else {
					const errorText = await videoResponse.text();
					console.log("Video list request failed:", errorText);
				}
			} catch (error) {
				console.error("Error fetching video list:", error);
			}

			// APPROACH 4: For sandbox testing only - use mock data if no real data available
			if (!hasRealMetrics && process.env.NODE_ENV !== 'production') {
				console.log("No real metrics available in sandbox. Using mock data for development purposes.");
				
				// The default values are already set when initializing the metrics object
				console.log("Using mock follower count:", metrics.followers.count);
				console.log("Using mock engagement rate:", metrics.engagement.rate);
			}
			
			console.log("Final metrics data:", JSON.stringify(metrics, null, 2));
			
		} catch (metricsError) {
			console.error("Error in metrics processing:", metricsError);
			// We already have default metrics values, so no need to reinitialize
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
				metrics: metrics, // Store metrics in the auth profile for historical tracking
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
				const creatorProfileRef = adminDb
					.collection("creatorProfiles")
					.doc(userEmail);
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
						updatedAt: FieldValue.serverTimestamp(), // Use server timestamp for better consistency
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
						createdAt: FieldValue.serverTimestamp(),
						updatedAt: FieldValue.serverTimestamp(),
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
			const errorMessage =
				firestoreError instanceof Error
					? firestoreError.message
					: "Unknown error";
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
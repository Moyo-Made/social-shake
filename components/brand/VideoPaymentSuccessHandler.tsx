"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VideoPaymentSuccessHandler() {
	const { currentUser } = useAuth();
	const [status, setStatus] = useState("processing");
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		const processPayment = async () => {
			let paymentIntentId = null;
			const paymentId = searchParams.get("payment_id");
			const sessionId = searchParams.get("session_id");

			try {
				if (!paymentId || !sessionId || !currentUser) {
					throw new Error("Missing required parameters");
				}

				// Get session details
				const sessionResponse = await axios.get(`/api/stripe/session/${sessionId}`);
				paymentIntentId = sessionResponse.data.paymentIntentId;

				// Verify payment and process business logic
				const verifyResponse = await axios.get(`/api/payment-success`, {
					params: { payment_id: paymentId, session_id: sessionId, type: "video" },
				});

				if (!verifyResponse.data.success) {
					throw new Error(verifyResponse.data.error || "Payment verification failed");
				}

				// Get payment details for navigation
				const paymentDetailsResponse = await axios.get(`/api/payment-details`, {
					params: { payment_id: paymentId },
				});

				const paymentDetails = paymentDetailsResponse.data.data;

				// Process all business logic in background
				await Promise.all([
					// Create purchase record
					axios.post("/api/purchases/create", {
						paymentId,
						videoId: paymentDetails.videoId,
						userId: currentUser.uid,
						creatorId: paymentDetails.creatorId,
						amount: paymentDetails.amount,
						videoTitle: paymentDetails.videoTitle,
						purchasedAt: new Date().toISOString(),
						status: "completed",

					}),

					// Update video stats
					axios.post(`/api/videos/${paymentDetails.videoId}/update-stats`, {
						action: "purchase",
					}),

					axios.post(`/api/videos/${paymentDetails.videoId}/increment-purchase`),

					// Update creator earnings
					axios.post("/api/creator/update-earnings", {
						creatorId: paymentDetails.creatorId,
						amount: paymentDetails.amount,
						type: "video_sale",
						videoId: paymentDetails.videoId,
						paymentId,
					}),

					// Create video access record
					axios.post("/api/video-access", {
						paymentId,
						videoId: paymentDetails.videoId,
						userId: currentUser.uid,
						accessGranted: true,
						grantedAt: new Date().toISOString(),
					}),
				]);

				// Send notification
				if (paymentDetails.creatorId) {
					await axios.post("/api/notifications", {
						type: "video_purchase_completed",
						creatorId: paymentDetails.creatorId,
						brandId: currentUser.uid,
						videoId: paymentDetails.videoId,
						amount: paymentDetails.amount,
						paymentId,
						message: `Your video "${paymentDetails.videoTitle}" has been purchased by ${currentUser.displayName || currentUser.email}.`,
					});
				}

				// Capture payment
				await axios.post("/api/stripe/capture-payment", {
					paymentIntentId,
					paymentId,
				});

				// Update payment status
				await axios.post("/api/update-payment", {
					paymentId,
					status: "completed",
					type: "video",
					videoId: paymentDetails.videoId,
					completedAt: new Date().toISOString(),
					stripeSessionId: sessionId,
				});

				// Clear session storage
				sessionStorage.removeItem("videoPurchaseData");

				setStatus("success");

				// Navigate back to creators all page after brief success display
				setTimeout(() => {
					router.push("/brand/dashboard/creators/all");
				}, 2000);

			} catch (error) {
				console.error("Payment processing error:", error);

				// Cancel payment on failure
				if (paymentIntentId) {
					try {
						await axios.post("/api/stripe/cancel-payment", {
							paymentIntentId,
							paymentId,
						});
					} catch (cancelError) {
						console.error("Failed to cancel payment:", cancelError);
					}
				}

				setError(error instanceof Error ? error.message : "Payment processing failed");
				setStatus("error");
			}
		};

		if (currentUser) {
			processPayment();
		}
	}, [searchParams, router, currentUser]);

	if (status === "processing") {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50">
				<div className="bg-white p-8 rounded-lg shadow-sm text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
					<h1 className="text-xl font-bold mb-2">Processing Payment...</h1>
					<p className="text-gray-600">Please wait while we confirm your purchase.</p>
				</div>
			</div>
		);
	}

	if (status === "success") {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50">
				<div className="bg-white p-8 rounded-lg shadow-sm text-center">
					<CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
					<h1 className="text-2xl font-bold mb-2 text-green-800">Purchase Successful!</h1>
					<p className="text-gray-600 mb-4">Your video has been purchased successfully.</p>
					<div className="text-sm text-gray-500">Redirecting you back...</div>
				</div>
			</div>
		);
	}

	if (status === "error") {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50">
				<div className="bg-white p-8 rounded-lg shadow-sm text-center max-w-md">
					<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h1 className="text-xl font-bold mb-2 text-red-800">Purchase Failed</h1>
					<p className="text-gray-600 mb-6">{error}</p>
					<div className="space-y-3">
						<Button
							onClick={() => router.push("/brand/dashboard/creators/all")}
							className="w-full bg-orange-500 hover:bg-orange-600 text-white"
						>
							Return to Creators
						</Button>
						<Button
							onClick={() => window.location.reload()}
							variant="outline"
							className="w-full"
						>
							Try Again
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return null;
}
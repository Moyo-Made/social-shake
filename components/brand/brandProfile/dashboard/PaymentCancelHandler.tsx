"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";

interface PaymentData {
	userId?: string;
	metadata?: {
		submissionId?: string;
		videoId?: string;
		projectId?: string;
		contestId?: string;
		orderId?: string;
	};
	submissionId?: string;
	videoId?: string;
	projectId?: string;
	contestId?: string;
	orderId?: string;
}

export default function PaymentCancelHandler() {
	const [status, setStatus] = useState("processing");
	const [error, setError] = useState<string | null>(null);
	const [paymentType, setPaymentType] = useState<string | null>(null);
	const [progress, setProgress] = useState(0);
	const router = useRouter();
	const searchParams = useSearchParams();
	const { getIdToken, currentUser } = useAuth();

	useEffect(() => {
		const processCancelledPayment = async () => {
			let paymentIntentId = null;

			try {
				const paymentId = searchParams.get("payment_id");
				const sessionId = searchParams.get("session_id");
				const type = searchParams.get("type");
				const orderId = searchParams.get("order_id");
				
				setPaymentType(type);

				if (!paymentId || !sessionId) {
					throw new Error("Missing payment information");
				}

				// Check if user is authenticated
				if (!currentUser) {
					throw new Error("Authentication required - please log in");
				}

				// Get authentication token
				if (!getIdToken) {
					throw new Error("Authentication function is not available");
				}
				const token = await getIdToken();
				if (!token) {
					throw new Error("Failed to get authentication token");
				}

				// Create axios config with auth headers
				const authConfig = {
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				};

				// Step 1: Get payment intent ID and session details
				setProgress(25);
				const sessionResponse = await axios.get(
					`/api/stripe/session/${sessionId}`,
					authConfig
				);
				paymentIntentId = sessionResponse.data.paymentIntentId;

				// Step 2: Get payment record to find related data
				setProgress(50);
				let cancelUrl = `/api/payment-cancel?payment_id=${paymentId}&session_id=${sessionId}`;
				if (type) cancelUrl += `&type=${type}`;
				if (orderId) cancelUrl += `&order_id=${orderId}`;

				const cancelResponse = await axios.get(cancelUrl, authConfig);
				const paymentRecord: PaymentData = cancelResponse.data.payment || {};

				// Step 3: Update payment record to cancelled status
				setProgress(75);
				await axios.post(
					"/api/update-payment",
					{
						paymentId,
						status: "cancelled",
						type,
						cancelledAt: new Date().toISOString(),
						...(orderId && { orderId }),
					},
					authConfig
				);

				// Step 4: Cancel the payment intent with Stripe
				if (paymentIntentId) {
					await axios.post(
						"/api/stripe/cancel-payment",
						{
							paymentIntentId,
							paymentId,
						},
						authConfig
					);
				}

				// Step 5: Handle post-cancellation cleanup based on payment type
				setProgress(90);
				await handlePostCancellationActions(
					type,
					paymentRecord,
					authConfig,
					orderId
				);

				setProgress(100);
				setStatus("cancelled");
			} catch (error) {
				console.error(`Error processing cancelled ${paymentType || "payment"}:`, error);

				// Better error logging
				if (axios.isAxiosError(error)) {
					console.error("API Error Response:", error.response?.data);
					console.error("API Error Status:", error.response?.status);
				}

				// Provide detailed error message
				let errorMessage =
					"An error occurred while processing the payment cancellation";
				if (axios.isAxiosError(error)) {
					errorMessage =
						error.response?.data?.error ||
						error.response?.data?.details ||
						error.message;
				} else if (error instanceof Error) {
					errorMessage = error.message;
				}

				setError(errorMessage);
				setStatus("error");
			}
		};

		// Only run when auth is ready and we're still processing
		if (status === "processing" && currentUser && getIdToken) {
			processCancelledPayment();
		}
	}, [searchParams, currentUser, getIdToken, status, paymentType]);

	const handlePostCancellationActions = async (
		type: string | null,
		paymentRecord: PaymentData,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		authConfig: any,
		orderId: string | null
	) => {
		switch (type) {
			case "submission_approval":
				await handleSubmissionCancellation(paymentRecord, authConfig);
				break;
			case "order":
			case "order_escrow":
				await handleOrderCancellation(paymentRecord, authConfig, orderId);
				break;
			case "video":
				await handleVideoCancellation(paymentRecord, authConfig);
				break;
			case "project":
				await handleProjectCancellation(paymentRecord, authConfig);
				break;
			case "contest":
				await handleContestCancellation(paymentRecord, authConfig);
				break;
			default:
				console.log("No specific post-cancellation actions required");
		}
	};

	const handleSubmissionCancellation = async (
		paymentRecord: PaymentData,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		authConfig: any
	) => {
		const submissionId =
			paymentRecord.metadata?.submissionId || paymentRecord.submissionId;

		if (submissionId) {
			try {
				console.log("Reverting submission status for:", submissionId);
				const updateResponse = await axios.post(
					"/api/project-submissions/update-status",
					{
						submissionId,
						status: "pending_approval",
					},
					authConfig
				);
				console.log("Submission status reverted successfully:", updateResponse.data);
			} catch (updateError) {
				console.error("Failed to revert submission status:", updateError);
				if (axios.isAxiosError(updateError)) {
					console.error("API Error:", updateError.response?.data);
				}
			}
		}
	};

	const handleOrderCancellation = async (
		paymentRecord: PaymentData,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		authConfig: any,
		orderId: string | null
	) => {
		const orderIdToUpdate = orderId || paymentRecord.metadata?.orderId || paymentRecord.orderId;
		
		if (orderIdToUpdate) {
			try {
				await axios.post(
					"/api/orders/update-status",
					{
						orderId: orderIdToUpdate,
						status: "payment_cancelled",
					},
					authConfig
				);
				console.log("Order status updated to cancelled successfully");
			} catch (updateError) {
				console.error("Failed to update order status:", updateError);
			}
		}
	};

	const handleVideoCancellation = async (
		paymentRecord: PaymentData,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		authConfig: any
	) => {
		const videoId = paymentRecord.metadata?.videoId || paymentRecord.videoId;
		
		if (videoId) {
			try {
				await axios.post(
					"/api/videos/purchase-cancelled",
					{
						videoId,
					},
					authConfig
				);
				console.log("Video purchase cancellation processed successfully");
			} catch (updateError) {
				console.error("Failed to process video purchase cancellation:", updateError);
			}
		}
	};

	const handleProjectCancellation = async (
		paymentRecord: PaymentData,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		authConfig: any
	) => {
		const projectId = paymentRecord.metadata?.projectId || paymentRecord.projectId;
		
		if (projectId) {
			try {
				await axios.post(
					"/api/projects/payment-cancelled",
					{
						projectId,
					},
					authConfig
				);
				console.log("Project payment cancellation processed successfully");
			} catch (updateError) {
				console.error("Failed to process project payment cancellation:", updateError);
			}
		}
	};

	const handleContestCancellation = async (
		paymentRecord: PaymentData,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		authConfig: any
	) => {
		const contestId = paymentRecord.metadata?.contestId || paymentRecord.contestId;
		
		if (contestId) {
			try {
				await axios.post(
					"/api/contests/payment-cancelled",
					{
						contestId,
					},
					authConfig
				);
				console.log("Contest payment cancellation processed successfully");
			} catch (updateError) {
				console.error("Failed to process contest payment cancellation:", updateError);
			}
		}
	};

	const getItemTypeDisplay = () => {
		switch (paymentType) {
			case "project":
				return "project";
			case "contest":
				return "contest";
			case "video":
				return "video";
			case "submission_approval":
				return "submission approval";
			case "order":
			case "order_escrow":
				return "order";
			default:
				return "payment";
		}
	};

	const getProcessingMessage = () => {
		switch (paymentType) {
			case "project":
				return "We're processing the cancellation and cleaning up your project draft.";
			case "contest":
				return "We're processing the cancellation and cleaning up your contest draft.";
			case "video":
				return "We're processing the cancellation of your video purchase.";
			case "submission_approval":
				return "We're processing the cancellation and reverting the submission status.";
			case "order":
				return "We're processing the cancellation of your order.";
			case "order_escrow":
				return "We're processing the cancellation and releasing the escrow.";
			default:
				return "We're processing the payment cancellation.";
		}
	};

	const getCancelledMessage = () => {
		switch (paymentType) {
			case "project":
				return "Your project draft has been preserved and no charges were made.";
			case "contest":
				return "Your contest draft has been preserved and no charges were made.";
			case "video":
				return "Your video purchase has been cancelled and no charges were made.";
			case "submission_approval":
				return "The submission approval has been cancelled and the submission remains pending.";
			case "order":
				return "Your order has been cancelled and no charges were made.";
			case "order_escrow":
				return "Your order has been cancelled and no funds were held in escrow.";
			default:
				return "Your payment has been cancelled successfully.";
		}
	};

	const getRedirectPath = () => {
		switch (paymentType) {
			case "project":
			case "submission_approval":
				return "/brand/dashboard/projects";
			case "contest":
				return "/brand/dashboard/contests";
			case "video":
				return "/brand/dashboard/videos";
			case "order":
			case "order_escrow":
				return "/brand/dashboard/orders";
			default:
				return "/brand/dashboard";
		}
	};

	const getViewButtonText = () => {
		switch (paymentType) {
			case "project":
			case "submission_approval":
				return "View Projects";
			case "contest":
				return "View Contests";
			case "video":
				return "Browse Videos";
			case "order":
			case "order_escrow":
				return "View Orders";
			default:
				return "View Dashboard";
		}
	};

	const getProgressMessage = () => {
		if (progress <= 25) return "Retrieving payment details...";
		if (progress <= 50) return "Processing cancellation...";
		if (progress <= 75) return "Updating payment records...";
		if (progress <= 90) return "Cleaning up resources...";
		return "Finalizing cancellation...";
	};

	const getTryAgainPath = () => {
		switch (paymentType) {
			case "project":
				return "/brand/dashboard/projects/new";
			case "contest":
				return "/brand/dashboard/contests/new";
			case "video":
				return "/brand/dashboard/videos";
			case "order":
				return "/brand/dashboard/orders";
			default:
				return "/brand/dashboard";
		}
	};

	const getTryAgainText = () => {
		switch (paymentType) {
			case "project":
				return "Create New Project";
			case "contest":
				return "Create New Contest";
			case "video":
				return "Browse Videos";
			case "order":
				return "View Orders";
			default:
				return "Go to Dashboard";
		}
	};

	if (status === "processing") {
		return (
			<div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
					<div className="text-center">
						{/* Animated processing circle */}
						<div className="relative mx-auto w-20 h-20 mb-6">
							<div className="absolute inset-0 rounded-full border-4 border-amber-100"></div>
							<div
								className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"
								style={{ animationDuration: "1s" }}
							></div>
							<div className="absolute inset-3 bg-amber-500 rounded-full flex items-center justify-center">
								<svg
									className="w-8 h-8 text-white animate-pulse"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</div>
						</div>

						<h1 className="text-2xl font-bold text-gray-900 mb-2">
							Processing Cancellation
						</h1>

						<p className="text-gray-600 mb-6">{getProcessingMessage()}</p>

						{/* Progress bar */}
						<div className="w-full bg-gray-200 rounded-full h-2 mb-4">
							<div
								className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 rounded-full transition-all duration-500 ease-out"
								style={{ width: `${progress}%` }}
							></div>
						</div>

						<p className="text-sm text-gray-500 mb-4">{getProgressMessage()}</p>

						<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
							<p className="text-xs text-blue-600">
								<span className="font-medium">
									Please don&apos;t close this page.
								</span>{" "}
								We&apos;re processing your {getItemTypeDisplay()} cancellation.
							</p>
						</div>
					</div>
				</div>
			</div>
		);
	}
 
	if (status === "error") {
		return (
			<div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-gray-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
					<div className="text-center">
						{/* Error icon */}
						<div className="mx-auto w-20 h-20 mb-6 bg-red-100 rounded-full flex items-center justify-center">
							<svg
								className="w-10 h-10 text-red-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
								/>
							</svg>
						</div>

						<h1 className="text-2xl font-bold text-gray-900 mb-2">
							Cancellation Processing Error
						</h1>

						<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
							<p className="text-red-700 text-sm">{error}</p>
						</div>

						<div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
							<h3 className="font-medium text-amber-800 mb-2">
								Don&apos;t worry
							</h3>
							<p className="text-sm text-amber-700 mb-2">
								Even though there was an error processing the cancellation, no charges were made to your account.
							</p>
						</div>

						<div className="space-y-3">
							<button
								onClick={() => router.push(getTryAgainPath())}
								className="w-full bg-black hover:bg-gray-800 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
							>
								{getTryAgainText()}
							</button>
							<button
								onClick={() => router.push("/brand/dashboard")}
								className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors duration-200"
							>
								Go to Dashboard
							</button>
						</div>

						<p className="text-xs text-gray-500 mt-4">
							If you continue to experience issues, please contact support.
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (status === "cancelled") {
		return (
			<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
					<div className="text-center">
						{/* Cancelled icon */}
						<div className="mx-auto w-20 h-20 mb-6 bg-gray-100 rounded-full flex items-center justify-center">
							<svg
								className="w-10 h-10 text-gray-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</div>

						<h1 className="text-2xl font-bold text-gray-900 mb-2">
							Payment Cancelled
						</h1>

						<p className="text-gray-600 mb-6">
							Your {getItemTypeDisplay()} payment has been cancelled successfully.
						</p>

						<div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
							<p className="text-sm text-gray-700">{getCancelledMessage()}</p>
						</div>

						<div className="space-y-3">
							{/* <button
								onClick={() => router.push(getTryAgainPath())}
								className="w-full bg-black hover:bg-gray-800 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
							>
								{getTryAgainText()}
							</button> */}

							<button
								onClick={() => router.push(getRedirectPath())}
								className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors duration-200"
							>
								{getViewButtonText()}
							</button>
						</div>

						<p className="text-xs text-gray-500 mt-4">
							You can always try again when you&apos;re ready.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return null;
}
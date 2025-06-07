"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";

export default function PaymentSuccessHandler() {
	const [status, setStatus] = useState("verifying");
	const [error, setError] = useState<string | null>(null);
	const [paymentType, setPaymentType] = useState<string | null>(null);
	const [progress, setProgress] = useState(0);
	const router = useRouter();
	const searchParams = useSearchParams();
	const { getIdToken, currentUser } = useAuth();

	useEffect(() => {
		const processPayment = async () => {
			let paymentIntentId = null;

			try {
				const paymentId = searchParams.get("payment_id");
				const sessionId = searchParams.get("session_id");
				const type = searchParams.get("type");
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

				// Step 1: Get payment intent ID
				setProgress(20);
				const sessionResponse = await axios.get(
					`/api/stripe/session/${sessionId}`,
					authConfig
				);
				paymentIntentId = sessionResponse.data.paymentIntentId;

				// Step 2: Verify payment
				setProgress(40);
				const verifyResponse = await axios.get(
					`/api/payment-success?payment_id=${paymentId}&session_id=${sessionId}&type=${type}`,
					authConfig
				);

				if (!verifyResponse.data.success) {
					throw new Error(
						verifyResponse.data.error || "Payment verification failed"
					);
				}

				// Get payment record to find the user and related data
				const paymentRecord = verifyResponse.data.payment || {};
				const userId = paymentRecord.userId;

				if (!userId) {
					throw new Error("User information not found in payment record");
				}

				// Step 3: Update payment record
				setProgress(60);
				await axios.post(
					"/api/update-payment",
					{
						paymentId,
						status: "completed",
						type,
						completedAt: new Date().toISOString(),
					},
					authConfig
				);

				setProgress(80);

				// Step 4: Update specific payment type records and related data
				console.log("Payment type:", type);
				console.log("Payment record:", paymentRecord);

				// Handle different payment types with their specific update logic
				if (type === "submission_approval") {
					const submissionId = paymentRecord.submissionId;
					if (submissionId) {
						try {
							console.log("Updating submission status for:", submissionId);
							const updateResponse = await axios.post(
								"/api/project-submissions/update-status",
								{
									submissionId,
									status: "approved",
								},
								authConfig
							);
							console.log("Submission status updated successfully:", updateResponse.data);

							// Update submission payment record
							await axios.post(
								"/api/update-submission-payment",
								{
									paymentId,
									status: "completed",
									completedAt: new Date().toISOString(),
								},
								authConfig
							);
						} catch (updateError) {
							console.error("Failed to update submission:", updateError);
							// Don't throw error here - payment was successful, just log the issue
						}
					}
				} else if (type === "video") {
					try {
						// Update video purchase record
						await axios.post(
							"/api/update-video-purchase",
							{
								paymentId,
								status: "completed",
								completedAt: new Date().toISOString(),
							},
							authConfig
						);
						console.log("Video purchase updated successfully");
					} catch (updateError) {
						console.error("Failed to update video purchase:", updateError);
					}
				} else if (type === "project") {
					try {
						// Update project payment record
						await axios.post(
							"/api/update-project-payment",
							{
								paymentId,
								status: "completed",
								completedAt: new Date().toISOString(),
							},
							authConfig
						);
						console.log("Project payment updated successfully");
					} catch (updateError) {
						console.error("Failed to update project payment:", updateError);
					}
				} else if (type === "contest") {
					try {
						// Update contest payment record
						await axios.post(
							"/api/update-contest-payment",
							{
								paymentId,
								status: "completed",
								completedAt: new Date().toISOString(),
							},
							authConfig
						);
						console.log("Contest payment updated successfully");
					} catch (updateError) {
						console.error("Failed to update contest payment:", updateError);
					}
				}

				// Legacy support: Handle old submission approval logic
				const legacySubmissionId = paymentRecord.metadata?.submissionId;
				if (legacySubmissionId && type !== "submission_approval") {
					try {
						console.log("Updating legacy submission status for:", legacySubmissionId);
						await axios.post(
							"/api/project-submissions/update-status",
							{
								submissionId: legacySubmissionId,
								status: "approved",
							},
							authConfig
						);
						console.log("Legacy submission status updated successfully");
					} catch (updateError) {
						console.error("Failed to update legacy submission status:", updateError);
					}
				}

				setProgress(100);
				setStatus("success");
			} catch (error) {
				console.error(`Error processing ${paymentType || "payment"}:`, error);

				// Better error logging
				if (axios.isAxiosError(error)) {
					console.error("API Error Response:", error.response?.data);
					console.error("API Error Status:", error.response?.status);
				}

				// CRITICAL: Cancel the payment intent if anything failed after verification
				if (paymentIntentId) {
					try {
						if (!getIdToken) {
							throw new Error("Authentication function is not available");
						}
						const token = await getIdToken();
						await axios.post(
							"/api/stripe/cancel-payment",
							{
								paymentIntentId,
								paymentId: searchParams.get("payment_id"),
							},
							{
								headers: {
									Authorization: `Bearer ${token}`,
									"Content-Type": "application/json",
								},
							}
						);
					} catch (cancelError) {
						console.error("Failed to cancel payment:", cancelError);
					}
				}

				// Provide detailed error message
				let errorMessage =
					"An unexpected error occurred while processing your payment";
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

		// Only run when auth is ready and we're still verifying
		if (status === "verifying" && currentUser && getIdToken) {
			processPayment();
		}
	}, [searchParams, router, getIdToken, currentUser, status]);

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
			default:
				return "payment";
		}
	};

	const getProcessingMessage = () => {
		switch (paymentType) {
			case "project":
				return "We're verifying your payment and processing your project.";
			case "contest":
				return "We're verifying your payment and processing your contest.";
			case "video":
				return "We're verifying your payment and processing your video purchase.";
			case "submission_approval":
				return "We're verifying your payment and approving the submission.";
			default:
				return "We're verifying your payment.";
		}
	};

	const getProgressMessage = () => {
		if (progress <= 20) return "Retrieving payment details...";
		if (progress <= 40) return "Verifying payment with Stripe...";
		if (progress <= 60) return "Updating payment records...";
		if (progress <= 80) return "Processing payment type specific updates...";
		return "Finalizing your order...";
	};

	if (status === "verifying") {
		return (
			<div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
					<div className="text-center">
						{/* Animated checkmark circle */}
						<div className="relative mx-auto w-20 h-20 mb-6">
							<div className="absolute inset-0 rounded-full border-4 border-orange-100"></div>
							<div
								className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"
								style={{ animationDuration: "1s" }}
							></div>
							<div className="absolute inset-3 bg-orange-500 rounded-full flex items-center justify-center">
								<svg
									className="w-8 h-8 text-white animate-pulse"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={3}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							</div>
						</div>

						<h1 className="text-2xl font-bold text-gray-900 mb-2">
							Processing Your Payment
						</h1>

						<p className="text-gray-600 mb-6">{getProcessingMessage()}</p>

						{/* Progress bar */}
						<div className="w-full bg-gray-200 rounded-full h-2 mb-4">
							<div
								className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500 ease-out"
								style={{ width: `${progress}%` }}
							></div>
						</div>

						<p className="text-sm text-gray-500 mb-4">{getProgressMessage()}</p>

						<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
							<p className="text-xs text-blue-600">
								<span className="font-medium">
									Please don&apos;t close this page.
								</span>{" "}
								We&apos;re finalizing your {getItemTypeDisplay()}.
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
							Payment Processing Error
						</h1>

						<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
							<p className="text-red-700 text-sm">{error}</p>
						</div>

						{error?.includes("draft not found") &&
							(paymentType === "project" || paymentType === "contest") && (
								<div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
									<h3 className="font-medium text-amber-800 mb-2">
										What happened?
									</h3>
									<p className="text-sm text-amber-700 mb-2">
										Your {paymentType} draft was not found. This can happen if:
									</p>
									<ul className="text-xs text-amber-600 space-y-1">
										<li>• The draft wasn&apos;t saved properly</li>
										<li>• Too much time has passed</li>
										<li>• There was a technical issue</li>
									</ul>
								</div>
							)}

						<div className="space-y-3">
							{(paymentType === "project" || paymentType === "contest") && (
								<button
									onClick={() =>
										router.push(
											paymentType === "project"
												? "/brand/dashboard/projects/new"
												: "/brand/dashboard/contests/new"
										)
									}
									className="w-full bg-black hover:bg-gray-800 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
								>
									Create New {paymentType === "project" ? "Project" : "Contest"}
								</button>
							)}
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

	if (status === "success") {
		return (
			<div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
					<div className="text-center">
						{/* Success checkmark */}
						<div className="mx-auto w-20 h-20 mb-6 bg-green-100 rounded-full flex items-center justify-center">
							<svg
								className="w-10 h-10 text-green-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={3}
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>

						<h1 className="text-2xl font-bold text-gray-900 mb-2">
							Payment Successful!
						</h1>

						<p className="text-gray-600 mb-6">
							Your {getItemTypeDisplay()} has been{" "}
							{paymentType === "video" ? "purchased" : "processed"} successfully.
						</p>

						<div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
							<p className="text-sm text-green-700">
								{paymentType === "project" &&
									"Your project payment has been processed successfully."}
								{paymentType === "contest" &&
									"Your contest payment has been processed successfully."}
								{paymentType === "video" &&
									"Your video purchase has been completed and is now available."}
								{paymentType === "submission_approval" &&
									"The submission has been approved and payment has been processed."}
								{!paymentType &&
									"Your payment has been processed successfully."}
							</p>
						</div>

						<div className="space-y-3">
							{/* <button
								onClick={() => {
									let redirectPath = "/brand/dashboard";

									switch (paymentType) {
										case "project":
											redirectPath = "/brand/dashboard/projects";
											break;
										case "contest":
											redirectPath = "/brand/dashboard/contests";
											break;
										case "video":
											redirectPath = "/brand/dashboard/videos";
											break;
										case "submission_approval":
											redirectPath = "/brand/dashboard/projects";
											break;
										default:
											redirectPath = "/brand/dashboard";
									}

									router.push(redirectPath);
								}}
								className="w-full bg-black hover:bg-gray-800 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
							>
								View{" "}
								{paymentType === "project"
									? "Projects"
									: paymentType === "contest"
										? "Contests"
										: paymentType === "video"
											? "Videos"
											: "Dashboard"}
							</button> */}

							<button
								onClick={() => router.push("/brand/dashboard")}
								className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors duration-200"
							>
								Go to Dashboard
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return null;
}
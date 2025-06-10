"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";

export default function PaymentSuccessHandler() {
	const [status, setStatus] = useState("verifying");
	const [error, setError] = useState<string | null>(null);
	type PaymentData = {
		escrowPayment?: boolean;
		paymentType?: string;
		// Add other properties as needed
	};

	const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
	const [progress, setProgress] = useState(0);
	const [retryCount, setRetryCount] = useState(0);
	const [isRetrying, setIsRetrying] = useState(false);
	const router = useRouter();
	const searchParams = useSearchParams();
	const { getIdToken, currentUser } = useAuth();

	const MAX_RETRIES = 3;
	const RETRY_DELAY = 2000; // 2 seconds

	useEffect(() => {
		const processPayment = async () => {
			try {
				const paymentId = searchParams.get("payment_id");
				const sessionId = searchParams.get("session_id");
				const type = searchParams.get("type");

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

				setProgress(20);

				// SIMPLIFIED: Only call the payment verification endpoint
				// This endpoint handles all the payment verification and updates
				const verifyResponse = await axios.get(
					`/api/payment-success?payment_id=${paymentId}&session_id=${sessionId}&type=${type}`,
					authConfig
				);

				setProgress(60);

				if (!verifyResponse.data.success) {
					// Handle specific error cases
					const errorData = verifyResponse.data;
					
					// If payment is unpaid and we haven't exceeded retry limit
					if (errorData.context?.payment_status === 'unpaid' && retryCount < MAX_RETRIES) {
						console.log(`Payment verification failed, retry ${retryCount + 1}/${MAX_RETRIES}`);
						setIsRetrying(true);
						setRetryCount(prev => prev + 1);
						
						// Wait before retrying
						setTimeout(() => {
							setIsRetrying(false);
							// This will trigger the useEffect again
						}, RETRY_DELAY);
						return;
					}
					
					throw new Error(
						verifyResponse.data.error || 
						verifyResponse.data.message || 
						"Payment verification failed"
					);
				}

				// Reset retry count on success
				setRetryCount(0);

				// Store payment data for display
				setPaymentData(verifyResponse.data.payment);

				setProgress(100);
				setStatus("success");

			} catch (error) {
				console.error(`Error processing payment:`, error);

				// Better error logging
				if (axios.isAxiosError(error)) {
					console.error("API Error Response:", error.response?.data);
					console.error("API Error Status:", error.response?.status);
				}

				// Provide detailed error message
				let errorMessage = "An unexpected error occurred while processing your payment";
				
				if (axios.isAxiosError(error)) {
					const responseData = error.response?.data;
					if (responseData?.context?.payment_status === 'unpaid') {
						errorMessage = "Payment was not completed. Please try again or contact support if you were charged.";
					} else {
						errorMessage = responseData?.error || 
									 responseData?.message || 
									 responseData?.details || 
									 error.message;
					}
				} else if (error instanceof Error) {
					errorMessage = error.message;
				}

				setError(errorMessage);
				setStatus("error");
			}
		};

		// Only run when auth is ready and we're still verifying
		if (status === "verifying" && currentUser && getIdToken && !isRetrying) {
			processPayment();
		}
	}, [searchParams, router, getIdToken, currentUser, status, retryCount, isRetrying]);

	const handleRetryPayment = () => {
		// Reset state and retry
		setRetryCount(0);
		setError(null);
		setStatus("verifying");
		setProgress(0);
	};

	const getItemTypeDisplay = () => {
		const type = paymentData?.paymentType || searchParams.get("type");
		switch (type) {
			case "project":
			case "order":
				return "project";
			case "contest":
				return "contest";
			case "video":
				return "video";
			case "submission_approval":
				return "submission approval";
			case "order_escrow":
				return "order";
			default:
				return "payment";
		}
	};

	const getProcessingMessage = () => {
		if (isRetrying) {
			return `Retrying payment verification (${retryCount}/${MAX_RETRIES})...`;
		}
		
		const type = paymentData?.paymentType || searchParams.get("type");
		switch (type) {
			case "project":
			case "order":
				return "We're verifying your payment and processing your project.";
			case "contest":
				return "We're verifying your payment and processing your contest.";
			case "video":
				return "We're verifying your payment and processing your video purchase.";
			case "submission_approval":
				return "We're verifying your payment and approving the submission.";
			case "order_escrow":
				return "We're verifying your payment and securing funds in escrow.";
			default:
				return "We're verifying your payment.";
		}
	};

	const getProgressMessage = () => {
		if (isRetrying) return "Retrying payment verification...";
		if (progress <= 20) return "Initializing payment verification...";
		if (progress <= 60) return "Verifying payment with Stripe...";
		return "Finalizing your order...";
	};

	const getSuccessMessage = () => {
		const type = paymentData?.paymentType;
		const isEscrow = paymentData?.escrowPayment || type === "order_escrow";
		
		if (isEscrow) {
			return "Your payment has been secured in escrow and will be released upon completion.";
		}
		
		switch (type) {
			case "project":
			case "order":
				return "Your project payment has been processed successfully.";
			case "contest":
				return "Your contest payment has been processed successfully.";
			case "video":
				return "Your video purchase has been completed and is now available.";
			case "submission_approval":
				return "The submission has been approved and payment has been processed.";
			default:
				return "Your payment has been processed successfully.";
		}
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
							{isRetrying ? "Retrying Payment Verification" : "Processing Your Payment"}
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

						{isRetrying && (
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
								<p className="text-xs text-yellow-700">
									<span className="font-medium">Retrying verification...</span><br />
									Sometimes payments need a moment to process.
								</p>
							</div>
						)}

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
		const isPaymentIncomplete = error?.includes("Payment was not completed") || 
								   error?.includes("Payment session not completed");

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
							{isPaymentIncomplete ? "Payment Not Completed" : "Payment Processing Error"}
						</h1>

						<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
							<p className="text-red-700 text-sm">{error}</p>
						</div>

						{isPaymentIncomplete && (
							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
								<h3 className="font-medium text-blue-800 mb-2">
									What happened?
								</h3>
								<p className="text-sm text-blue-700 mb-2">
									The payment was not completed. This can happen if:
								</p>
								<ul className="text-xs text-blue-600 space-y-1">
									<li>• The checkout page was closed before payment</li>
									<li>• Your payment method was declined</li>
									<li>• There was a network connection issue</li>
									<li>• The payment session expired</li>
								</ul>
							</div>
						)}

						<div className="space-y-3">
							{isPaymentIncomplete && retryCount < MAX_RETRIES && (
								<button
									onClick={handleRetryPayment}
									className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
								>
									Try Again
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
							If you continue to experience issues or were charged, please contact support.
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
							{paymentData?.paymentType === "video" ? "purchased" : "processed"} successfully.
						</p>

						<div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
							<p className="text-sm text-green-700">
								{getSuccessMessage()}
							</p>
						</div>

						{/* Show escrow info if applicable */}
						{(paymentData?.escrowPayment || paymentData?.paymentType === "order_escrow") && (
							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
								<p className="text-sm text-blue-700">
									<span className="font-medium">Escrow Payment:</span> Your funds are held securely and will be released to the creator upon completion of your order.
								</p>
							</div>
						)}

						<div className="space-y-3">
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
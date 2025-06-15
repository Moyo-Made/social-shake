"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface SubscriptionDetails {
	id: string;
	status: string;
	trialStart: string | null;
	trialEnd: string | null;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	planType: string;
	amount: number;
	currency: string;
	cancelAtPeriodEnd: boolean;
	stripeSubscriptionId: string;
}

interface Customer {
	id: string;
	email: string | null;
	name: string | null;
}

interface VerificationResponse {
	success: boolean;
	message: string;
	subscription: SubscriptionDetails;
	customer: Customer;
	error?: string;
	details?: string;
}

export default function SubscriptionSuccessPage() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const sessionId = searchParams.get("session_id");
	const subscriptionId = searchParams.get("subscription_id"); // Only use if explicitly provided

	const [loading, setLoading] = useState(true);
	const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
	const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [retryCount, setRetryCount] = useState(0);
	const [isRetrying, setIsRetrying] = useState(false);

	const verifySubscription = async (isRetry = false) => {
		if (isRetry) {
			setIsRetrying(true);
		} else {
			setLoading(true);
		}
		
		setError(null);

		try {
			let response;

			// If we have a subscription ID from URL params, try GET first
			if (subscriptionId) {
				console.log("Trying GET request with subscription_id:", subscriptionId);
				response = await fetch(
					`/api/subscription/verify?subscription_id=${encodeURIComponent(subscriptionId)}&session_id=${encodeURIComponent(sessionId!)}`
				);

				// If GET fails, we'll fall back to POST
				if (!response.ok) {
					console.log("GET request failed, falling back to POST");
				}
			}

			// If no subscription ID provided or GET failed, use POST method
			if (!subscriptionId || !response || !response.ok) {
				console.log("Using POST request for verification");
				response = await fetch("/api/subscription/verify", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ sessionId }),
				});
			}

			const data: VerificationResponse = await response.json();

			if (!response.ok) {
				// Handle specific error cases
				if (data.error?.includes("already verified") || data.message?.includes("already verified")) {
					// Subscription already verified - this is actually success
					if (data.subscription) {
						setSubscriptionDetails(data.subscription);
						setCustomerDetails(data.customer);
						return;
					}
				}

				throw new Error(data.error || data.details || "Failed to verify subscription");
			}

			if (data.success) {
				setSubscriptionDetails(data.subscription);
				setCustomerDetails(data.customer);
				console.log("Subscription verified successfully:", data.message);
			} else {
				throw new Error(data.error || "Verification was not successful");
			}

		} catch (err) {
			console.error("Error verifying subscription:", err);
			const errorMessage = err instanceof Error ? err.message : "Failed to verify subscription";
			
			// Only set error if this isn't a retry or we've exceeded retry attempts
			if (!isRetry || retryCount >= 2) {
				setError(errorMessage);
			} else {
				// Auto-retry after a delay for certain errors
				if (errorMessage.includes("pending") || errorMessage.includes("processing") || errorMessage.includes("not found")) {
					setTimeout(() => {
						setRetryCount(prev => prev + 1);
						verifySubscription(true);
					}, 3000);
					return;
				} else {
					setError(errorMessage);
				}
			}
		} finally {
			setLoading(false);
			setIsRetrying(false);
		}
	};

	useEffect(() => {
		if (!sessionId) {
			setError("Invalid session. Please try again.");
			setLoading(false);
			return;
		}

		verifySubscription();
	}, [sessionId, subscriptionId]);

	const handleRetry = () => {
		setRetryCount(prev => prev + 1);
		verifySubscription(true);
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "N/A";
		try {
			return new Date(dateString).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});
		} catch  {
			console.warn("Invalid date string:", dateString);
			return "Invalid Date";
		}
	};

	const formatAmount = (amount: number, currency: string) => {
		try {
			return new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: currency.toUpperCase(),
			}).format(amount / 100); // Stripe amounts are in cents
		} catch {
			console.warn("Error formatting amount:", { amount, currency });
			return `${amount / 100} ${currency.toUpperCase()}`;
		}
	};

	const handleContinue = () => {
		router.push("/brand/dashboard");
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-2">
						Verifying your subscription...
					</h2>
					<p className="text-gray-600">
						Please wait while we confirm your payment and set up your account.
					</p>
					{retryCount > 0 && (
						<p className="text-sm text-gray-500 mt-2">
							Attempt {retryCount + 1} of 3...
						</p>
					)}
				</div>
			</div>
		);
	}

	if (isRetrying) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-2">
						Retrying verification...
					</h2>
					<p className="text-gray-600">
						We&apos;re double-checking your subscription status.
					</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
					<AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-2">
						Subscription Verification Failed
					</h2>
					<p className="text-gray-600 mb-6">{error}</p>
					
					<div className="space-y-3">
						{retryCount < 2 && (
							<button
								onClick={handleRetry}
								disabled={isRetrying}
								className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isRetrying ? "Retrying..." : "Try Again"}
							</button>
						)}
						
						<button
							onClick={() => router.push("/brand/settings/subscription")}
							className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
						>
							Check Subscription Status
						</button>
						
						<button
							onClick={() => router.push("/brand/pricing")}
							className="w-full text-gray-500 hover:text-gray-700 transition-colors"
						>
							Return to Pricing
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center">
			<div className="max-w-2xl w-full bg-white rounded-lg shadow-sm p-8">
				<div className="text-center mb-8">
					<CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						Welcome to Your Pro Plan!
					</h1>
					<p className="text-lg text-gray-600">
						Your subscription has been successfully activated.
					</p>
					{customerDetails?.email && (
						<p className="text-sm text-gray-500 mt-2">
							Confirmation sent to {customerDetails.email}
						</p>
					)}
				</div>

				{subscriptionDetails && (
					<div className="bg-gray-50 rounded-lg p-6 mb-8">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">
							Subscription Details
						</h2>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="bg-white p-4 rounded-md">
								<h3 className="font-medium text-gray-900 mb-2">Plan Type</h3>
								<p className="text-gray-600 capitalize">
									{subscriptionDetails.planType}
								</p>
							</div>

							<div className="bg-white p-4 rounded-md">
								<h3 className="font-medium text-gray-900 mb-2">Status</h3>
								<span
									className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
										subscriptionDetails.status === "trialing"
											? "bg-blue-100 text-blue-800"
											: subscriptionDetails.status === "active"
												? "bg-green-100 text-green-800"
												: subscriptionDetails.status === "past_due"
													? "bg-yellow-100 text-yellow-800"
													: "bg-gray-100 text-gray-800"
									}`}
								>
									{subscriptionDetails.status === "trialing"
										? "Free Trial"
										: subscriptionDetails.status === "active"
											? "Active"
											: subscriptionDetails.status.replace("_", " ").toUpperCase()}
								</span>
							</div>

							{subscriptionDetails.amount > 0 && (
								<div className="bg-white p-4 rounded-md">
									<h3 className="font-medium text-gray-900 mb-2">Amount</h3>
									<p className="text-gray-600">
										{formatAmount(subscriptionDetails.amount, subscriptionDetails.currency)}
										{subscriptionDetails.status === "trialing" ? " after trial" : " per month"}
									</p>
								</div>
							)}

							{subscriptionDetails.status === "trialing" && subscriptionDetails.trialEnd && (
								<div className="bg-white p-4 rounded-md">
									<h3 className="font-medium text-gray-900 mb-2">Trial Ends</h3>
									<p className="text-gray-600">
										{formatDate(subscriptionDetails.trialEnd)}
									</p>
								</div>
							)}

							<div className="bg-white p-4 rounded-md">
								<h3 className="font-medium text-gray-900 mb-2">
									{subscriptionDetails.status === "trialing" ? "First Billing Date" : "Next Billing Date"}
								</h3>
								<p className="text-gray-600">
									{formatDate(subscriptionDetails.currentPeriodEnd)}
								</p>
							</div>

							{subscriptionDetails.cancelAtPeriodEnd && (
								<div className="bg-white p-4 rounded-md border-l-4 border-yellow-400">
									<h3 className="font-medium text-gray-900 mb-2">Cancellation</h3>
									<p className="text-sm text-yellow-700">
										Will cancel at period end
									</p>
								</div>
							)}
						</div>
					</div>
				)}

				{subscriptionDetails?.status === "trialing" && (
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
						<h3 className="font-semibold text-blue-900 mb-2">
							🎉 Your 7-Day Free Trial Has Started!
						</h3>
						<p className="text-blue-800 mb-4">
							You won&apos;t be charged until your trial period ends. You can
							cancel anytime during the trial with no charges.
						</p>
						<ul className="text-blue-800 text-sm space-y-1">
							<li>• Access to all Pro features</li>
							<li>• Unlimited brand campaigns</li>
							<li>• Advanced analytics and reporting</li>
							<li>• Priority customer support</li>
						</ul>
					</div>
				)}

				<div className="flex flex-col sm:flex-row gap-4">
					<button
						onClick={handleContinue}
						className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors font-medium"
					>
						Get Started with Your Dashboard
					</button>

					<button
						onClick={() => router.push("/brand/settings/subscription")}
						className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-md hover:bg-gray-200 transition-colors font-medium"
					>
						Manage Subscription
					</button>
				</div>

				<div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
					<p>
						Need help? Contact our support team at{" "}
						<a
							href="mailto:info@social-shake.com"
							className="text-blue-600 hover:underline"
						>
							info@social-shake.com
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}
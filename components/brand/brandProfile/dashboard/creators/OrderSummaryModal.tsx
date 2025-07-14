import React, { useState, useEffect } from "react";
import {
	X,
	Edit3,
	User,
	Package,
	Clock,
	Target,
	MessageSquare,
	Video,
	Palette,
	FileText,
	AlertTriangle,
} from "lucide-react";
import { ScriptFormData } from "./ScriptInputForm";
import { ProjectBriefData } from "./ProjectFormBrief";
import { Button } from "@/components/ui/button";
import { Stripe, loadStripe } from "@stripe/stripe-js";
import { useAuth } from "@/context/AuthContext";

interface OrderSummaryModalProps {
	isOpen: boolean;
	onClose: () => void;
	onBack: () => void;
	onOrderConfirm: () => void;
	packageType: string;
	videoCount: number;
	totalPrice: number;
	creatorName: string;
	selectedCreator: { id: string; name: string; email: string };
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	selectedPackage: any;
	scriptChoice: "brand-written" | "creator-written";
	scriptFormData: ScriptFormData;
	projectBriefData: ProjectBriefData;
	onEditStep?: (step: "script" | "brief") => void;
	onOrderSuccess?: (orderId: string, paymentIntentId: string) => void;
}

interface PendingOrder {
	id: string;
	status: string;
	// Add other relevant fields based on your API response
}

// Error handling component
const OrderErrorHandler = ({
	error,
	onRetry,
}: {
	error: string;
	onRetry: () => void;
}) => {
	if (error?.includes("CREATOR_ACCOUNT_NOT_CONNECTED")) {
		return (
			<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
				<div className="flex">
					<AlertTriangle className="h-5 w-5 text-yellow-400" />
					<div className="ml-3">
						<h3 className="text-sm font-medium text-yellow-800">
							Creator Account Setup Required
						</h3>
						<div className="mt-2 text-sm text-yellow-700">
							<p>
								The creator needs to connect their Stripe account before orders
								can be processed. Please contact them to complete this setup.
							</p>
						</div>
						<div className="mt-4">
							<button
								onClick={onRetry}
								className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-sm hover:bg-yellow-200"
							>
								Try Again
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
			<div className="text-red-700">{error}</div>
			<button
				onClick={onRetry}
				className="mt-2 bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
			>
				Try Again
			</button>
		</div>
	);
};

const SubscriptionRequiredModal = ({
	isOpen,
	onClose,
	message,
}: {
	isOpen: boolean;
	onClose: () => void;
	message: string;
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
			<div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
				<div className="p-6">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-semibold text-gray-900">
							Subscription Required
						</h3>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
					<div className="mb-6">
						<p className="text-gray-600">{message}</p>
					</div>
					<div className="flex gap-3">
						<button
							onClick={onClose}
							className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
						>
							Cancel
						</button>
						<button
							onClick={() => {
								// Navigate to subscription page
								window.location.href = "/brand/dashboard/settings";
							}}
							className="flex-1 px-4 py-2 bg-[#FD5C02] hover:bg-orange-600 text-white rounded-lg transition-colors"
						>
							Upgrade Now
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

const OrderSummaryModal: React.FC<OrderSummaryModalProps> = ({
	isOpen,
	onClose,
	onBack,
	packageType,
	videoCount,
	totalPrice,
	creatorName,
	selectedCreator,
	selectedPackage,
	scriptChoice,
	scriptFormData,
	projectBriefData,

	onEditStep,
	onOrderSuccess,
}) => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// const [orderId, setOrderId] = useState<string | null>(null);
	// const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
	const [showResumeOrder, setShowResumeOrder] = useState(false);

	const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
	const { currentUser } = useAuth();

	const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

	const actualTotalPrice =
		packageType === "bulk" ? totalPrice * videoCount : totalPrice;

	// Resume incomplete orders on page load
	useEffect(() => {
		const checkSubscriptionAndPendingOrder = async () => {
			if (typeof window !== "undefined" && window.localStorage && isOpen && currentUser) {
				// Check subscription first
				try {
					const subscriptionResponse = await fetch(`/api/subscription/status?userId=${currentUser.uid}`);
					const subscriptionData = await subscriptionResponse.json();
					
					if (!subscriptionData.hasActiveSubscription) {
						setShowSubscriptionModal(true);
						return;
					}
				} catch (error) {
					console.error("Failed to check subscription:", error);
				}
				const pendingOrderId = localStorage.getItem("pendingOrderId");
				if (pendingOrderId && currentUser) {
					const order = await checkOrderStatus(pendingOrderId);
					if (order && order.status === "draft") {
						// Show resume order option
						setShowResumeOrder(true);
						setPendingOrder(order);
					} else {
						// Clear if order is complete or doesn't exist
						localStorage.removeItem("pendingOrderId");
					}
				}
			}
		};

		checkSubscriptionAndPendingOrder();
	}, [currentUser, isOpen]);

	if (!isOpen) return null;

	// handleOrderConfirm function for OrderSummaryModal
	const handleOrderConfirm = async () => {
		try {
			setLoading(true);
			setError(null);

			const subscriptionResponse = await fetch(`/api/subscription/status?userId=${currentUser?.uid}`);
		
			if (!subscriptionResponse.ok) {
				throw new Error("Failed to check subscription status");
			}
	
			const subscriptionData = await subscriptionResponse.json();
			
			// If user doesn't have an active subscription, show modal and return
			if (!subscriptionData.hasActiveSubscription) {
				setShowSubscriptionModal(true);
				return;
			}

			// Step 1: Check creator's Stripe connection
			const stripeStatusResponse = await fetch(
				`/api/creator/stripe-status?userId=${selectedCreator.id}`
			);

			const stripeStatus = await stripeStatusResponse.json();
			if (!stripeStatus.connected) {
				setError("CREATOR_ACCOUNT_NOT_CONNECTED");
				return;
			}

			// Step 2: Create draft order after checking creator's Stripe connection
			const orderRequirements = {
				scripts: scriptFormData.scripts,
				generalRequirements: scriptFormData.generalRequirements,
			};

			const projectBrief = projectBriefData;

			// Step 1: Create draft order (basic info only)
			const orderResponse = await fetch("/api/orders", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId: currentUser?.uid,
					creatorId: selectedCreator?.id,
					packageType: packageType,
					videoCount: videoCount,
					totalPrice: actualTotalPrice,
					paymentType: "escrow",
				}),
			});

			if (!orderResponse.ok) {
				if (orderResponse.status === 402) {
					const result = await orderResponse.json();
					if (result.subscriptionRequired) {
						setShowSubscriptionModal(true);
						return;
					}
				}
				throw new Error("Failed to create order");
			}

			const orderResult = await orderResponse.json();
			const newOrderId = orderResult.orderId;

			// Step 2: Update scripts section
			await fetch("/api/orders", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orderId: newOrderId,
					userId: currentUser?.uid,
					section: "scripts",
					data: { scripts: scriptFormData.scripts },
				}),
			});

			// Step 3: Update requirements section
			await fetch("/api/orders", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orderId: newOrderId,
					userId: currentUser?.uid,
					section: "requirements",
					data: {
						generalRequirements: scriptFormData.generalRequirements,
						videoSpecs: scriptFormData.videoSpecs,
					},
				}),
			});

			// Step 4: Update project brief section
			await fetch("/api/orders", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orderId: newOrderId,
					userId: currentUser?.uid,
					section: "project_brief",
					data: projectBriefData,
				}),
			});

			// Step 5: Finalize order
			await fetch("/api/orders", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orderId: newOrderId,
					userId: currentUser?.uid,
				}),
			});

			

			// Step 3: Create payment intent for escrow
			const paymentFormData = new FormData();
			if (currentUser?.uid) {
				paymentFormData.append("userId", currentUser.uid);
			} else {
				throw new Error("User is not authenticated.");
			}
			paymentFormData.append("brandEmail", currentUser.email);
			paymentFormData.append("amount", actualTotalPrice.toString());
			paymentFormData.append("paymentType", "order_escrow");
			paymentFormData.append("orderId", newOrderId);
			paymentFormData.append("creatorId", selectedCreator.id);
			paymentFormData.append(
				"projectTitle",
				`${packageType} Package - ${videoCount} Videos`
			);
			paymentFormData.append("packageType", packageType);
			paymentFormData.append("videoCount", videoCount.toString());

			const paymentResponse = await fetch("/api/create-payment-intent", {
				method: "POST",
				body: paymentFormData,
			});

			const paymentResult = await paymentResponse.json();

			if (!paymentResult.success) {
				throw new Error(
					paymentResult.error || "Failed to create payment intent"
				);
			}

			const { paymentId } = paymentResult;

			// Step 4: Save order state for recovery
			if (typeof window !== "undefined" && window.sessionStorage) {
				sessionStorage.setItem("pendingOrderId", newOrderId);
				sessionStorage.setItem(
					"orderFormData",
					JSON.stringify({
						selectedCreator,
						selectedPackage,
						scriptChoice,
						scriptFormData,
						projectBriefData,
						actualTotalPrice,
					})
				);
			}

			// Step 5: Create Stripe checkout session for escrow payment
			const checkoutData = {
				amount: actualTotalPrice,
				paymentId: paymentId,
				projectTitle: `${packageType} Package - ${videoCount} Videos`,
				userEmail: currentUser.email,
				userId: currentUser.uid,
				paymentType: "order_escrow",
				orderId: newOrderId,
				creatorId: selectedCreator.id,
				orderData: {
					packageType: selectedPackage.type,
					videoCount: selectedPackage.videoCount,
					scriptChoice,
					requirements: orderRequirements,
					projectBrief: projectBrief,
				},
			};

			const checkoutResponse = await fetch("/api/create-checkout-session", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(checkoutData),
			});

			const checkoutResult = await checkoutResponse.json();

			if (!checkoutResult.success) {
				throw new Error(
					checkoutResult.error || "Failed to create checkout session"
				);
			}

			const { sessionId } = checkoutResult;

			// Step 6: Initialize Stripe and redirect to checkout
			const stripe: Stripe | null = await loadStripe(
				process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || ""
			);

			if (!stripe) {
				throw new Error("Stripe is not initialized. Please try again later.");
			}

			// Redirect to Stripe checkout
			const { error } = await stripe.redirectToCheckout({ sessionId });

			if (error) {
				console.error("Error redirecting to checkout:", error);
				throw new Error("Payment initiation failed. Please try again.");
			}

			// Success callback (this won't execute due to redirect, but keeping for completeness)
			if (onOrderSuccess) {
				onOrderSuccess(newOrderId, paymentId);
			}
		} catch (error: unknown) {
			console.error("Order creation error:", error);
			// Add this check for subscription errors
			if (error instanceof Error && error.message.includes("subscription")) {
				setShowSubscriptionModal(true);
				return;
			}

			if (error instanceof Error) {
				setError(error.message);
			} else {
				setError("An unexpected error occurred.");
			}
		} finally {
			setLoading(false);
		}
	};

	// Add order status checking
	const checkOrderStatus = async (orderId: string) => {
		try {
			const response = await fetch(`/api/orders/${orderId}`, {});

			const result = await response.json();
			return result.order;
		} catch (error) {
			console.error("Error checking order status:", error);
			return null;
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	const InfoRow = ({
		label,
		value,
		icon: Icon,
	}: {
		label: string;
		value: string;
		icon?: React.ElementType;
	}) => {
		if (!value) return null;
		return (
			<div className="flex items-start gap-3 py-2">
				{Icon && (
					<Icon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
				)}
				<div className="flex-1 min-w-0">
					<span className="text-sm font-medium text-gray-700">{label}:</span>
					<p className="text-sm text-gray-600 mt-1 break-words">{value}</p>
				</div>
			</div>
		);
	};

	const retryOrder = () => {
		setError(null);
		handleOrderConfirm();
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
					<div>
						<h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
						<p className="text-gray-600 mt-1">
							Review your project details before confirmation
						</p>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-white/50 rounded-full transition-colors"
					>
						<X className="w-6 h-6 text-gray-500" />
					</button>
				</div>

				{/* Error Display */}
				{error && (
					<div className="p-6 pb-0">
						<OrderErrorHandler error={error} onRetry={retryOrder} />
					</div>
				)}

				{/* Add this subscription modal */}
				<SubscriptionRequiredModal
					isOpen={showSubscriptionModal}
					onClose={() => {
						setShowSubscriptionModal(false);
						setLoading(false);
					}}
					message="You need an active subscription to create orders."
				/>

				{/* Resume Order Notice */}
				{showResumeOrder && pendingOrder && (
					<div className="p-6 pb-0">
						<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
							<div className="flex items-center gap-3">
								<div className="w-2 h-2 bg-blue-500 rounded-full"></div>
								<p className="text-blue-800 text-sm">
									You have an incomplete order. Would you like to resume it?
								</p>
								<button
									onClick={() => {
										// Handle resume logic here
										if (typeof window !== "undefined" && window.localStorage) {
											localStorage.removeItem("pendingOrderId");
										}
										setShowResumeOrder(false);
									}}
									className="ml-auto text-blue-600 hover:text-blue-800 text-sm underline"
								>
									Dismiss
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Step Indicator */}
				<div className="mt-6 mx-6">
					<div className="flex items-center">
						<div className="flex items-center text-green-600">
							<div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
								✓
							</div>
							<span className="ml-2 text-sm font-medium">Script Approach</span>
						</div>
						<div className=" h-px bg-gray-300 flex-1"></div>
						<div className="flex items-center text-green-600">
							<div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
								✓
							</div>
							<span className="ml-2 text-sm font-medium">
								Scripts & Details
							</span>
						</div>
						<div className="mx-4 h-px bg-gray-300 flex-1"></div>
						<div className="flex items-center text-green-600">
							<div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
								✓
							</div>
							<span className="ml-2 text-sm font-medium">Project Brief</span>
						</div>
						<div className="mx-4 h-px bg-gray-300 flex-1"></div>
						<div className="flex items-center text-orange-600">
							<div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm">
								4
							</div>
							<span className="ml-2 text-sm">Review</span>
						</div>
					</div>
				</div>

				{/* Scrollable Content - Rest of your existing content */}
				<div className="flex-1 overflow-y-auto">
					<div className="p-6 space-y-8">
						{/* Package Overview */}
						<div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
							<div className="flex items-center gap-3 mb-6">
								<div className="p-2 bg-blue-100 rounded-lg">
									<Package className="w-5 h-5 text-blue-600" />
								</div>
								<h3 className="text-xl font-semibold text-gray-900">
									Package Details
								</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
								<div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
									<User className="w-6 h-6 text-blue-600 mx-auto mb-3" />
									<p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
										Creator
									</p>
									<p className="font-semibold text-gray-900">{creatorName}</p>
								</div>
								<div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
									<Package className="w-6 h-6 text-purple-600 mx-auto mb-3" />
									<p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
										Package
									</p>
									<p className="font-semibold text-gray-900 capitalize">
										{packageType}
									</p>
								</div>
								<div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
									<Video className="w-6 h-6 text-indigo-600 mx-auto mb-3" />
									<p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
										Videos
									</p>
									<p className="font-semibold text-gray-900">{videoCount}</p>
								</div>
								<div className="text-center p-4 bg-white rounded-xl shadow-sm border border-green-100 hover:shadow-md transition-shadow">
									<div className="w-6 h-6 text-green-600 mx-auto mb-3 font-bold text-xl">
										$
									</div>
									<p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
										Total
									</p>
									<p className="font-bold text-green-600 text-lg">
										{formatCurrency(totalPrice)}
									</p>
								</div>
							</div>
							<div className="mt-6 p-4 bg-white rounded-xl border border-gray-100">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-gray-700">
										Script Type:
									</span>
									<span className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 rounded-full text-sm font-medium capitalize border border-blue-200">
										{scriptChoice.replace("-", " ")}
									</span>
								</div>
							</div>
						</div>

						{/* Script Details */}
						<div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
							<div className="flex items-center justify-between mb-6">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-purple-100 rounded-lg">
										<FileText className="w-5 h-5 text-purple-600" />
									</div>
									<h3 className="text-xl font-semibold text-gray-900">
										{scriptChoice === "brand-written"
											? "Brand Scripts & Requirements"
											: "Creative Brief"}
									</h3>
								</div>
								{onEditStep && (
									<button
										onClick={() => onEditStep("script")}
										className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
									>
										<Edit3 className="w-4 h-4" />
										Edit
									</button>
								)}
							</div>

							{scriptChoice === "brand-written" &&
								scriptFormData.scripts.length > 0 && (
									<div className="mb-6">
										<h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
											<div className="w-1 h-5 bg-purple-500 rounded-full"></div>
											Scripts
										</h4>
										<div className="space-y-4">
											{scriptFormData.scripts.map((script, index) => (
												<div
													key={index}
													className="bg-gray-50 rounded-xl p-5 border border-gray-200"
												>
													<div className="flex items-center gap-3 mb-3">
														<span className="w-7 h-7 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
															{index + 1}
														</span>
														<h5 className="font-medium text-gray-900">
															{script.title || `Video ${index + 1}`}
														</h5>
													</div>
													{script.script && (
														<div className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
															<p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
																{script.script}
															</p>
														</div>
													)}
													{script.notes && (
														<div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3 border border-blue-100">
															<strong className="text-blue-800">Notes:</strong>{" "}
															{script.notes}
														</div>
													)}
												</div>
											))}
										</div>
									</div>
								)}

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-4">
									<InfoRow
										label="Target Audience"
										value={scriptFormData.generalRequirements.targetAudience}
										icon={Target}
									/>
									<InfoRow
										label="Brand Voice"
										value={scriptFormData.generalRequirements.brandVoice}
										icon={MessageSquare}
									/>
									<InfoRow
										label="Call to Action"
										value={scriptFormData.generalRequirements.callToAction}
										icon={Target}
									/>
								</div>
								<div className="space-y-4">
									<InfoRow
										label="Key Messages"
										value={scriptFormData.generalRequirements.keyMessages}
										icon={MessageSquare}
									/>
									<InfoRow
										label="Style Preferences"
										value={scriptFormData.generalRequirements.stylePreferences}
										icon={Palette}
									/>
									<InfoRow
										label="Additional Notes"
										value={scriptFormData.generalRequirements.additionalNotes}
										icon={FileText}
									/>
								</div>
							</div>
						</div>

						{/* Project Specifications */}
						<div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
							<div className="flex items-center justify-between mb-6">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-green-100 rounded-lg">
										<Video className="w-5 h-5 text-green-600" />
									</div>
									<h3 className="text-xl font-semibold text-gray-900">
										Project Specifications
									</h3>
								</div>
								{onEditStep && (
									<button
										onClick={() => onEditStep("brief")}
										className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
									>
										<Edit3 className="w-4 h-4" />
										Edit
									</button>
								)}
							</div>

							{/* Project Overview */}
							<div className="mb-8">
								<h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-3">
									<div className="w-1 h-5 bg-blue-500 rounded-full"></div>
									<Target className="w-5 h-5 text-blue-600" />
									Project Overview
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-4">
										<InfoRow
											label="Project Goal"
											value={projectBriefData.projectOverview.projectGoal}
										/>
										<InfoRow
											label="Target Audience"
											value={projectBriefData.projectOverview.targetAudience}
										/>
									</div>
									<div className="space-y-4">
										<InfoRow
											label="Key Messages"
											value={projectBriefData.projectOverview.keyMessages}
										/>
										<InfoRow
											label="Brand Background"
											value={projectBriefData.projectOverview.brandBackground}
										/>
									</div>
								</div>
							</div>

							{/* Content Requirements */}
							<div className="mb-8">
								<h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-3">
									<div className="w-1 h-5 bg-purple-500 rounded-full"></div>
									<MessageSquare className="w-5 h-5 text-purple-600" />
									Content Requirements
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-4">
										<InfoRow
											label="Content Type"
											value={projectBriefData.contentRequirements.contentType}
										/>
										<InfoRow
											label="Tone & Style"
											value={projectBriefData.contentRequirements.toneAndStyle}
										/>
										<InfoRow
											label="Call to Action"
											value={projectBriefData.contentRequirements.callToAction}
										/>
									</div>
									<div className="space-y-4">
										<InfoRow
											label="Must Include"
											value={projectBriefData.contentRequirements.mustInclude}
										/>
										<InfoRow
											label="Must Avoid"
											value={projectBriefData.contentRequirements.mustAvoid}
										/>
										<InfoRow
											label="Competitor Examples"
											value={
												projectBriefData.contentRequirements.competitorExamples
											}
										/>
									</div>
								</div>
							</div>

							{/* Video Specifications */}
							<div className="mb-8">
								<h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-3">
									<div className="w-1 h-5 bg-green-500 rounded-full"></div>
									<Video className="w-5 h-5 text-green-600" />
									Video Specifications
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
									<div className="bg-green-50 rounded-xl p-4 border border-green-200">
										<p className="text-xs text-green-600 uppercase tracking-wide mb-2">
											Duration
										</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.videoSpecs.duration}
										</p>
									</div>
									<div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
										<p className="text-xs text-blue-600 uppercase tracking-wide mb-2">
											Format
										</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.videoSpecs.format}
										</p>
									</div>
									<div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
										<p className="text-xs text-purple-600 uppercase tracking-wide mb-2">
											Delivery Format
										</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.videoSpecs.deliveryFormat}
										</p>
									</div>
									<div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
										<p className="text-xs text-indigo-600 uppercase tracking-wide mb-2">
											Script Approval
										</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.videoSpecs.scriptApproval}
										</p>
									</div>
								</div>
							</div>

							{/* Timeline */}
							<div>
								<h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-3">
									<div className="w-1 h-5 bg-orange-500 rounded-full"></div>
									<Clock className="w-5 h-5 text-orange-600" />
									Timeline & Delivery
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
									<div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
										<p className="text-xs text-orange-600 uppercase tracking-wide mb-2">
											Script Deadline
										</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.timeline.scriptDeadline}
										</p>
									</div>
									<div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
										<p className="text-xs text-orange-600 uppercase tracking-wide mb-2">
											Revision Rounds
										</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.timeline.revisionRounds}
										</p>
									</div>
									<div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
										<p className="text-xs text-orange-600 uppercase tracking-wide mb-2">
											Final Deadline
										</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.timeline.finalDeadline}
										</p>
									</div>
									<div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
										<p className="text-xs text-orange-600 uppercase tracking-wide mb-2">
											Urgency
										</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.timeline.urgency}
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Cost Breakdown */}
						<div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
							<div className="flex items-center gap-3 mb-6">
								<div className="p-2 bg-green-100 rounded-lg">
									<div className="w-5 h-5 text-green-600 font-bold text-lg flex items-center justify-center">
										$
									</div>
								</div>
								<h3 className="text-lg font-semibold text-gray-900">
									Cost Breakdown
								</h3>
							</div>
							<div className="space-y-4">
								<div className="flex justify-between items-center py-3 px-4 bg-white rounded-lg border border-green-100">
									<span className=" text-gray-700 font-medium">
										{packageType === "bulk"
											? `Bulk Package (${videoCount} videos)`
											: ` ${packageType.charAt(0).toUpperCase() + packageType.slice(1)} ${videoCount === 1 ? "Video" : "Videos"}`}
									</span>
									<span className="font-semibold text-gray-900 text-base">
										{formatCurrency(actualTotalPrice)}
									</span>
								</div>
								<div className="border-t border-green-200 pt-4">
									<div className="flex justify-between items-center px-4">
										<span className="text-base font-bold text-gray-900">
											Total Amount
										</span>
										<span className="text-lg font-bold text-green-600">
											{formatCurrency(actualTotalPrice)}
										</span>
									</div>
									<div className="mt-3 p-4 bg-white rounded-lg border border-green-100">
										<p className="text-sm text-gray-600 flex items-center gap-2">
											<div className="w-2 h-2 bg-green-500 rounded-full"></div>
											Payment will be held in escrow until project completion
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Fixed Footer */}
				<div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
					<button
						onClick={onBack}
						disabled={loading}
						className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
					>
						← Back
					</button>
					<div className="flex items-center gap-6">
						<p className="text-sm text-gray-600 max-w-xs">
							By confirming, you agree to our terms and conditions
						</p>
						<Button
							onClick={handleOrderConfirm}
							disabled={loading}
							className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all duration-200 font-semibold transform disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? "Processing..." : "Confirm Order →"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default OrderSummaryModal;

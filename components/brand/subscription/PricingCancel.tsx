"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
	Check,
	X,
	Zap,
	Star,
	Users,
	BarChart3,
	AlertCircle,
	Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function PricingPage() {
	const searchParams = useSearchParams();
	const canceled = searchParams.get("canceled");
	const { currentUser } = useAuth();

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showCancelMessage, setShowCancelMessage] = useState(false);

	useEffect(() => {
		if (canceled === "true") {
			setShowCancelMessage(true);
			// Hide the cancel message after 10 seconds
			const timer = setTimeout(() => {
				setShowCancelMessage(false);
			}, 10000);
			return () => clearTimeout(timer);
		}
	}, [canceled]);

	const handleSubscribe = async () => {
		setLoading(true);
		setError(null);

		try {
			// Get user data from your auth system
			// This is a placeholder - replace with your actual user data fetching
			const userData = {
				userEmail: currentUser?.email,
				userId: currentUser?.uid,
				userName: currentUser?.displayName,
				userType: "brand",
				planType: "pro",
			};

			const response = await fetch("/api/create-subscription-checkout", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...userData,
					successUrl: `${window.location.origin}/brand/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
					cancelUrl: `${window.location.origin}/brand/pricing?canceled=true`,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to create checkout session");
			}

			// Redirect to Stripe Checkout
			window.location.href = data.sessionUrl;
		} catch (err) {
			console.error("Error creating subscription:", err);
			setError(
				err instanceof Error
					? err.message
					: "Failed to start subscription process"
			);
		} finally {
			setLoading(false);
		}
	};

	const features = [
		"Unlimited brand campaigns",
		"Advanced creator matching",
		"Real-time analytics dashboard",
		"Campaign performance tracking",
		"Priority customer support",
		"Custom reporting tools",
		"Team collaboration features",
		"API access",
	];

	return (
		<div className="min-h-screen bg-gray-50 py-12">
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
				{/* Cancel Message */}
				{showCancelMessage && (
					<div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center">
						<AlertCircle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
						<div className="flex-1">
							<h3 className="text-sm font-medium text-yellow-800">
								Subscription Canceled
							</h3>
							<p className="text-sm text-yellow-700 mt-1">
								No worries! Your subscription setup was canceled. You can try
								again anytime or contact support if you need help.
							</p>
						</div>
						<button
							onClick={() => setShowCancelMessage(false)}
							className="ml-4 text-yellow-600 hover:text-yellow-800"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				)}

				{/* Header */}
				<div className="text-center mb-12">
					<h1 className="text-4xl font-bold text-gray-900 mb-4">
						Choose Your Plan
					</h1>
					<p className="text-xl text-gray-600 max-w-2xl mx-auto">
						Start your free trial today. No credit card required for the first 7
						days.
					</p>
				</div>

				{/* Pricing Cards */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
					{/* Free Plan */}
					<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
						<div className="text-center mb-8">
							<h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
							<div className="mb-4">
								<span className="text-4xl font-bold text-gray-900">$0</span>
								<span className="text-gray-600 ml-2">/month</span>
							</div>
							<p className="text-gray-600">Perfect for getting started</p>
						</div>

						<ul className="space-y-4 mb-8">
							<li className="flex items-center">
								<Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
								<span className="text-gray-700">
									Up to 3 campaigns per month
								</span>
							</li>
							<li className="flex items-center">
								<Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
								<span className="text-gray-700">Basic creator search</span>
							</li>
							<li className="flex items-center">
								<Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
								<span className="text-gray-700">Email support</span>
							</li>
							<li className="flex items-center">
								<X className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
								<span className="text-gray-400">Advanced analytics</span>
							</li>
							<li className="flex items-center">
								<X className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
								<span className="text-gray-400">Team collaboration</span>
							</li>
						</ul>

						<button
							disabled
							className="w-full bg-gray-100 text-gray-400 py-3 px-6 rounded-lg font-medium cursor-not-allowed"
						>
							Current Plan
						</button>
					</div>

					{/* Pro Plan */}
					<div className="bg-white rounded-2xl shadow-lg border-2 border-blue-500 p-8 relative">
						{/* Popular Badge */}
						<div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
							<span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center">
								<Star className="h-4 w-4 mr-1" />
								Most Popular
							</span>
						</div>

						<div className="text-center mb-8">
							<h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
							<div className="mb-4">
								<span className="text-4xl font-bold text-gray-900">$99</span>
								<span className="text-gray-600 ml-2">/month</span>
							</div>
							<p className="text-gray-600">Everything you need to scale</p>
						</div>

						<ul className="space-y-4 mb-8">
							{features.map((feature, index) => (
								<li key={index} className="flex items-center">
									<Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
									<span className="text-gray-700">{feature}</span>
								</li>
							))}
						</ul>

						{error && (
							<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
								<p className="text-red-700 text-sm">{error}</p>
							</div>
						)}

						<button
							onClick={handleSubscribe}
							disabled={loading}
							className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
						>
							{loading ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Setting up your trial...
								</>
							) : (
								<>
									<Zap className="h-4 w-4 mr-2" />
									Start 7-Day Free Trial
								</>
							)}
						</button>

						<p className="text-center text-sm text-gray-500 mt-3">
							No credit card required • Cancel anytime
						</p>
					</div>
				</div>

				{/* Features Grid */}
				<div className="bg-white rounded-2xl shadow-sm p-8 mb-12">
					<h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
						Why Choose Our Pro Plan?
					</h2>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						<div className="text-center">
							<div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
								<Users className="h-8 w-8 text-blue-600" />
							</div>
							<h3 className="text-lg font-semibold text-gray-900 mb-2">
								Advanced Creator Matching
							</h3>
							<p className="text-gray-600">
								Find the perfect creators for your brand with our AI-powered
								matching algorithm.
							</p>
						</div>

						<div className="text-center">
							<div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
								<BarChart3 className="h-8 w-8 text-green-600" />
							</div>
							<h3 className="text-lg font-semibold text-gray-900 mb-2">
								Real-Time Analytics
							</h3>
							<p className="text-gray-600">
								Track campaign performance with detailed analytics and
								actionable insights.
							</p>
						</div>

						<div className="text-center">
							<div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
								<Zap className="h-8 w-8 text-purple-600" />
							</div>
							<h3 className="text-lg font-semibold text-gray-900 mb-2">
								Priority Support
							</h3>
							<p className="text-gray-600">
								Get help when you need it with our dedicated support team and
								faster response times.
							</p>
						</div>
					</div>
				</div>

				{/* FAQ Section */}
				<div className="bg-gray-100 rounded-2xl p-8">
					<h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
						Frequently Asked Questions
					</h2>

					<div className="space-y-6">
						<div>
							<h3 className="font-semibold text-gray-900 mb-2">
								What happens during the free trial?
							</h3>
							<p className="text-gray-600">
								You get full access to all Pro features for 7 days. No credit
								card is charged during the trial period.
							</p>
						</div>

						<div>
							<h3 className="font-semibold text-gray-900 mb-2">
								Can I cancel anytime?
							</h3>
							<p className="text-gray-600">
								Yes, you can cancel your subscription at any time. If you cancel
								during the trial, you won&apos;t be charged.
							</p>
						</div>

						<div>
							<h3 className="font-semibold text-gray-900 mb-2">
								What payment methods do you accept?
							</h3>
							<p className="text-gray-600">
								We accept all major credit cards including Visa, Mastercard,
								American Express, and Discover.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "../../ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext"; 

const PricingPage = () => {
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();
	const { currentUser } = useAuth();

	const handleStartTrial = async () => {
		if (!currentUser) {
			// Redirect to signup if not logged in
			router.push("/brand/signup");
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch("/api/create-subscription-checkout", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: currentUser.uid,
					userEmail: currentUser.email,
					userName: currentUser.displayName || currentUser.email,
					userType: "brand",
					planType: "pro",
				}),
			});

			const data = await response.json();

			

			if (data.success && data.sessionUrl) {
				// Redirect to Stripe Checkout
				window.location.href = data.sessionUrl;
			} else {
				console.error("Failed to create checkout session:", data.error);
				alert("Failed to start trial. Please try again.");
			}
		} catch (error) {
			console.error("Error starting trial:", error);
			alert("An error occurred. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 font-satoshi">
			{/* Section 1: Main Pricing Cards */}
			<div className="py-16 px-4">
				<div className="max-w-6xl mx-auto">
					<div className="text-center mb-12">
						<h1 className="text-3xl font-bold text-gray-900 mb-3">
							Connect with Top Creators & Scale Your Brand
						</h1>
						<p className="text-lg text-gray-600 mb-5">
							Access 500+ talented creators, manage unlimited campaigns, and grow your brand — all from one powerful platform.
						</p>
					</div>

					<div className="flex justify-center mx-auto">
						{/* Basic Plan */}
						<div className="bg-white w-full max-w-lg border border-[#00000014] rounded-2xl overflow-hidden shadow-sm p-8 h-fit">
							<div className="flex justify-center mb-6">
								<Badge
									variant="outline"
									className="text-[#414651] font-light bg-white border-[#D5D7DA] rounded-lg px-3 py-2"
								>
									<span className="mr-1.5 bg-[#FD5C02] border-[3px] border-[#F4EBFF] rounded-full w-3 h-3 inline-block"></span>
									Social Shake Pro
								</Badge>
							</div>

							<div className="mb-8">
								<div className="flex justify-center items-baseline gap-2">
									<span className="text-5xl font-medium text-gray-900">
										FREE
									</span>
									<span className="text-gray-500">/ 7 Days</span>
								</div>
								<p className="text-gray-500 mt-2 text-center">Then $99/month</p>
								<p className="text-sm text-gray-400 mt-1 text-center">
									Card required • Cancel anytime
								</p>
							</div>

							<div className="space-y-4 mb-8">
								<div className="flex items-start gap-5">
									<span className="text-2xl mt-1">👥</span>
									<div>
										<div className="text-gray-700 font-medium">Access 500+ Creators</div>
										<div className="text-gray-600 text-sm">Find the perfect talent for any campaign — instantly.</div>
									</div>
								</div>
								<div className="flex items-start gap-5">
									<span className="text-2xl mt-1">📂</span>
									<div>
										<div className="text-gray-700 font-medium">Unlimited Projects</div>
										<div className="text-gray-600 text-sm">Run as many campaigns as you like, with no limits.</div>
									</div>
								</div>
								<div className="flex items-start gap-5">
									<span className="text-2xl mt-1">✉️</span>
									<div>
										<div className="text-gray-700 font-medium">Unlimited Invitations & Messaging</div>
										<div className="text-gray-600 text-sm">Invite, chat, and collaborate with creators freely.</div>
									</div>
								</div>
								<div className="flex items-start gap-5">
									<span className="text-2xl mt-1">🎬</span>
									<div>
										<div className="text-gray-700 font-medium">Unlimited Content per Collaboration</div>
										<div className="text-gray-600 text-sm">Get as many deliverables as you need from every creator.</div>
									</div>
								</div>
								<div className="flex items-start gap-5">
									<span className="text-2xl mt-1">📜</span>
									<div>
										<div className="text-gray-700 font-medium">Full Commercial Usage Rights</div>
										<div className="text-gray-600 text-sm">Use content in paid ads, websites, social media & more.</div>
									</div>
								</div>
								<div className="flex items-start gap-5">
									<span className="text-2xl mt-1">📁</span>
									<div>
										<div className="text-gray-700 font-medium">Centralized Content Library</div>
										<div className="text-gray-600 text-sm">All your assets, organized and ready to use anytime.</div>
									</div>
								</div>
								<div className="flex items-start gap-5">
									<span className="text-2xl mt-1">⚡</span>
									<div>
										<div className="text-gray-700 font-medium">Priority Support</div>
										<div className="text-gray-600 text-sm">Get faster help from our dedicated customer success team.</div>
									</div>
								</div>
							</div>

							<Button 
								onClick={handleStartTrial}
								disabled={isLoading}
								className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium disabled:opacity-50"
							>
								{isLoading ? "Processing..." : "Start Free Trial"}
							</Button>

							{/* Trust indicators */}
							<div className="mt-4 text-center">
								<div className="flex items-center justify-center gap-2 text-sm text-gray-500">
									<span>🔒</span>
									<span>Secure payment with Stripe</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PricingPage;
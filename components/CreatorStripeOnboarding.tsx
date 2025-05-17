// src/components/CreatorStripeOnboarding.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CreatorStripeOnboardingProps {
	userId: string;
}

const CreatorStripeOnboarding: React.FC<CreatorStripeOnboardingProps> = ({
	userId,
}) => {
	const [loading, setLoading] = useState(false);
	const [onboardingStatus, setOnboardingStatus] = useState<
		"not_started" | "pending" | "complete"
	>("not_started");
	const { currentUser } = useAuth();

	useEffect(() => {
		checkOnboardingStatus();
	}, [userId]);

	const checkOnboardingStatus = async () => {
		try {
			const response = await fetch(
				`/api/stripe/onboarding-status?userId=${userId}`
			);
			const data = await response.json();

			if (data.status) {
				setOnboardingStatus(data.status);
			}
		} catch (error) {
			console.error("Error checking onboarding status:", error);
		}
	};

	const startOnboarding = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/stripe/create-connect-account", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId,
					email: currentUser?.email,
				}),
			});

			const data = await response.json();

			if (data.url) {
				// Redirect to Stripe's onboarding flow
				window.location.href = data.url;
			} else {
				throw new Error(data.error || "Failed to create onboarding link");
			}
		} catch (error) {
			console.error("Error starting onboarding:", error);
		} finally {
			setLoading(false);
		}
	};

	const getStatusText = () => {
		switch (onboardingStatus) {
			case "not_started":
				return "You need to connect your Stripe account to receive contest winnings.";
			case "pending":
				return "Your Stripe account setup is incomplete. Please finish setting up your account to receive payments.";
			case "complete":
				return "Your payment account is ready to receive contest winnings.";
			default:
				return "";
		}
	};

	return (
		<div className="p-4 bg-white rounded-lg border border-gray-200 mb-4">
			<h3 className="text-lg font-semibold mb-2">Payment Account Setup</h3>
			<p className="text-sm text-gray-600 mb-4">{getStatusText()}</p>

			{onboardingStatus !== "complete" && (
				<Button
					onClick={startOnboarding}
					disabled={loading}
					className="bg-blue-600 hover:bg-blue-700 text-white"
				>
					{loading ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Processing...
						</>
					) : onboardingStatus === "pending" ? (
						"Complete Account Setup"
					) : (
						"Connect Stripe Account"
					)}
				</Button>
			)}
		</div>
	);
};

export default CreatorStripeOnboarding;

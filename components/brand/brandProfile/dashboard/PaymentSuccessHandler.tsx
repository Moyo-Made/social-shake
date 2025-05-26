"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import PaymentSuccessfulCard from "./PaymentSuccessfulCard";

export default function PaymentSuccessHandler() {
	const [status, setStatus] = useState("verifying");
	const [error, setError] = useState<string | null>(null);
	const [paymentType, setPaymentType] = useState<string | null>(null);
	const router = useRouter();
	const searchParams = useSearchParams();

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
	
			// Step 1: Get payment intent ID
			const sessionResponse = await axios.get(`/api/stripe/session/${sessionId}`);
			paymentIntentId = sessionResponse.data.paymentIntentId;
	
			// Step 2: Verify payment
			const verifyResponse = await axios.get(
			  `/api/payment-success?payment_id=${paymentId}&session_id=${sessionId}&type=${type}`
			);
	
			if (!verifyResponse.data.success) {
			  throw new Error(verifyResponse.data.error || "Payment verification failed");
			}
	
			// Step 3: Process business logic
			const storageKey = type === "project" ? "projectFormData" : "contestFormData";
			const storedFormData = sessionStorage.getItem(storageKey);
	
			if (!storedFormData) {
			  throw new Error(`${type} data not found`);
			}
	
			const formData = JSON.parse(storedFormData);
			const paymentData = {
			  ...formData,
			  isDraft: false,
			  paymentId,
			  stripeSessionId: sessionId,
			  paymentStatus: "completed", // Will be completed after capture
			};
	
			// Create contest/project
			const apiEndpoint = type === "project" ? "/api/projects" : "/api/contests";
			const response = await axios.post(apiEndpoint, paymentData);
	
			if (!response.data.success) {
			  throw new Error(response.data.error || `Failed to create ${type}`);
			}
	
			const itemId = type === "project" ? response.data.data.projectId : response.data.data.contestId;
	
			// Step 4: CAPTURE the payment (everything succeeded)
			await axios.post("/api/stripe/capture-payment", {
			  paymentIntentId,
			  paymentId
			});
	
			// Step 5: Update payment record
			await axios.post("/api/update-payment", {
			  paymentId,
			  status: "completed",
			  type,
			  itemId,
			  completedAt: new Date().toISOString()
			});
	
			// Clean up
			sessionStorage.removeItem(storageKey);
			sessionStorage.removeItem(`${type}FormStep`);
			
			setStatus("success");
	
			// Redirect
			setTimeout(() => {
			  const redirectPath = type === "project" ? "/brand/dashboard/projects" : "/brand/dashboard/contests";
			  router.push(redirectPath);
			}, 2000);
	
		  } catch (error) {
			console.error(`Error processing ${paymentType || "payment"}:`, error);
			
			// CRITICAL: Cancel the payment intent if anything failed
			if (paymentIntentId) {
			  try {
				await axios.post("/api/stripe/cancel-payment", {
				  paymentIntentId,
				  paymentId: searchParams.get("payment_id")
				});
			  } catch (cancelError) {
				console.error("Failed to cancel payment:", cancelError);
			  }
			}
			
			setError(error instanceof Error ? error.message : "An error occurred");
			setStatus("error");
		  }
		};
	
		processPayment();
	  }, [searchParams, router]);

	const getItemTypeDisplay = () => {
		return paymentType === "project" ? "project" : "contest";
	};

	if (status === "verifying") {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<h1 className="text-2xl font-bold mb-2">Processing your payment...</h1>
				<p className="text-gray-600">
					Please wait while we verify your payment and create your{" "}
					{getItemTypeDisplay()}.
				</p>
			</div>
		);
	}

	if (status === "error") {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen">
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md mx-auto mb-4">
					<h1 className="text-xl font-bold mb-2">Payment Processing Error</h1>
					<p>{error}</p>
				</div>
				<button
					onClick={() =>
						router.push(
							paymentType === "project"
								? "/brand/project/new"
								: "/brand/contest/new"
						)
					}
					className="bg-black hover:bg-gray-800 text-white py-2 px-4 rounded"
				>
					Return to {paymentType === "project" ? "Project" : "Contest"} Creation
				</button>
			</div>
		);
	}

	if (status === "success") {
		return <PaymentSuccessfulCard type={paymentType as "project" | "contest"} />;
	  }

	return null;
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import PaymentSuccessfulCard from "./PaymentSuccessfulCard";
import SideNavLayout from "./SideNav";

export default function PaymentSuccessPage() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [contestId, setContestId] = useState<string | null>(null);
	const searchParams = useSearchParams();

	const paymentId = searchParams.get("payment_id");
	const sessionId = searchParams.get("session_id");

	useEffect(() => {
		async function processPayment() {
			if (!paymentId || !sessionId) {
				setError("Missing payment information");
				setLoading(false);
				return;
			}

			try {
				const response = await axios.get(
					`/api/payment-success?payment_id=${paymentId}&session_id=${sessionId}`
				);

				if (response.data.success) {
					setContestId(response.data.data.contestId);

					// Clear any stored form data from localStorage
					localStorage.removeItem(`contestPayment_${paymentId}`);
					localStorage.removeItem("contestFormDraft");
					sessionStorage.removeItem("contestFormSession");
					sessionStorage.removeItem("contestFormStep");
				} else {
					setError(
						response.data.error || "Failed to complete payment processing"
					);
				}
			} catch (error) {
				console.error("Error processing payment:", error);
				setError(
					error instanceof Error
						? error.message
						: "An error occurred processing your payment"
				);
			} finally {
				setLoading(false);
			}
		}

		processPayment();
	}, [paymentId, sessionId]);

	return (
		<SideNavLayout>
			<div className="max-w-[48rem] mx-auto py-16 px-4">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold mb-4">Payment Completed</h1>
					<p className="text-gray-600 mb-8">
						Thank you for your payment. We&apos;re processing your contest
						submission.
					</p>
				</div>

				{loading && (
					<div className="flex flex-col items-center justify-center p-8">
						<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
						<p className="text-lg text-gray-700">Processing your payment...</p>
					</div>
				)}

				{error && (
					<Alert variant="destructive" className="mb-6">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{contestId && <PaymentSuccessfulCard />}
			</div>
		</SideNavLayout>
	);
}
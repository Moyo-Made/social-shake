import { useState, useEffect } from "react";
import { auth } from "@/config/firebase";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios";
import StripeConnect from "../StripeConnect";

const Payout = () => {
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [disconnecting, setDisconnecting] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);

	// Handle any alert messages
	useEffect(() => {
		if (success || error) {
			const timer = setTimeout(() => {
				setSuccess("");
				setError("");
			}, 5000);
			return () => clearTimeout(timer);
		}
	}, [success, error]);

	const handleDisconnectStripe = async () => {
		if (!auth.currentUser?.uid) return;

		try {
			setDisconnecting(true);
			setError("");

			// Call your disconnect endpoint
			await axios.post("/api/creator/disconnect-stripe-account", {
				userId: auth.currentUser.uid,
			});

			// Force refresh the StripeConnect component to show the connect button again
			setRefreshKey((prev) => prev + 1);
			setSuccess("Stripe account disconnected successfully");
		} catch (err) {
			console.error("Error disconnecting Stripe account:", err);
			setError("Failed to disconnect your Stripe account. Please try again.");
		} finally {
			setDisconnecting(false);
		}
	};

	return (
		<div className="border border-[#FFD9C3] rounded-lg p-6">
		
			{error && (
				<Alert variant="destructive" className="mb-4">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			{success && (
				<Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
					<AlertDescription>{success}</AlertDescription>
				</Alert>
			)}

			{/* Stripe Connect Section */}
			<div className="mt-2">
				<div className=" ">
					<div className="flex items-start space-x-4">
						{/* Stripe Logo/Icon */}
						<div className="flex-shrink-0">
							<div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
								<svg
									className="w-6 h-6 text-white"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.54-2.354 1.54-2.648 0-5.49-1.251-7.245-2.312l-.955 5.556C3.812 22.585 7.024 24 11.99 24c8.806 0 10.249-4.814 10.249-8.31 0-4.1-2.191-6.806-8.263-6.54z" />
								</svg>
							</div>
						</div>

						{/* Content */}
						<div className="flex-1">
							<div className="mb-6">
								<h3 className="text-xl font-semibold text-gray-900 mb-2">
									Connect with Stripe
								</h3>
								<p className="text-gray-600 text-base">
									Securely connect your Stripe account to receive payments
									directly from campaigns and contests. Stripe provides fast,
									secure, and reliable payment processing.
								</p>
							</div>

							{/* Features */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
								<div className="flex items-center space-x-3">
									<div className="w-2 h-2 bg-green-500 rounded-full"></div>
									<span className="text-sm text-gray-700">
										Secure payment processing
									</span>
								</div>
								<div className="flex items-center space-x-3">
									<div className="w-2 h-2 bg-green-500 rounded-full"></div>
									<span className="text-sm text-gray-700">Fast payouts</span>
								</div>
								<div className="flex items-center space-x-3">
									<div className="w-2 h-2 bg-green-500 rounded-full"></div>
									<span className="text-sm text-gray-700">
										Global payment support
									</span>
								</div>
								<div className="flex items-center space-x-3">
									<div className="w-2 h-2 bg-green-500 rounded-full"></div>
									<span className="text-sm text-gray-700">
										Transaction tracking
									</span>
								</div>
							</div>

							{/* Stripe Connect Component */}
							<div key={refreshKey} className="mb-6">
								<StripeConnect
									userId={auth.currentUser?.uid}
									redirectPath="/creator/dashboard/settings"
									testMode={true}
								/>
							</div>

							{/* Disconnect Section */}
							<div className="bg-white rounded-lg border border-red-200 p-4">
								<div className="flex items-start space-x-3">
									<div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
										<svg
											className="w-4 h-4 text-red-600"
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
									<div className="flex-1">
										<h4 className="font-medium text-gray-900 mb-1">
											Disconnect Account
										</h4>
										<p className="text-sm text-gray-600 mb-3">
											Disconnecting your Stripe account will prevent you from
											receiving payments from campaigns and contests.
										</p>
										<Button
											variant="outline"
											onClick={handleDisconnectStripe}
											disabled={disconnecting}
											className="border-red-300 bg-red-600 hover:bg-red-700 hover:border-red-400 text-white"
										>
											{disconnecting
												? "Disconnecting..."
												: "Disconnect Stripe Account"}
										</Button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Payout;

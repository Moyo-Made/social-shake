import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ApplicationSuccessModal from "./ProjectApplicationSuccessModal";

interface ApplyModalProps {
	isOpen: boolean;
	onClose: () => void;
	projectId: string;
	onSubmitSuccess?: () => void;
}

export default function ApplyModal({
	isOpen,
	onClose,
	projectId,
	onSubmitSuccess,
}: ApplyModalProps) {
	const { currentUser } = useAuth();
	const [reason, setReason] = useState("");
	const [productOwnership, setProductOwnership] = useState("need");
	const [deliveryTime, setDeliveryTime] = useState("1-3 days");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [, setSuccess] = useState(false);
	const [showShippingForm, setShowShippingForm] = useState(true); // Default to true since default is "need"
	const [canShip, setCanShip] = useState(true);
	const [addressValidated, setAddressValidated] = useState(false);
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [charCount, setCharCount] = useState(0);

	// Shipping address fields
	const [addressLine1, setAddressLine1] = useState("");
	const [addressLine2, setAddressLine2] = useState("");
	const [city, setCity] = useState("");
	const [state, setState] = useState("");
	const [zipCode, setZipCode] = useState("");
	const [country, setCountry] = useState("United States");

	// Reset form when modal opens/closes
	useEffect(() => {
		if (isOpen) {
			setReason("");
			setCharCount(0);
			setProductOwnership("need");
			setDeliveryTime("1-3 days");
			setShowShippingForm(true); // Default to true since default is "need"
			setError("");
			setSuccess(false);
			setShowSuccessModal(false);
			setAddressLine1("");
			setAddressLine2("");
			setCity("");
			setState("");
			setZipCode("");
			setCountry("United States");
			setAddressValidated(false);
			setCanShip(true);
		}
	}, [isOpen]);

	// Toggle shipping form visibility based on product ownership
	useEffect(() => {
		if (productOwnership === "need") {
			setShowShippingForm(true);
		} else {
			setShowShippingForm(false);
			// Reset shipping-related states when user doesn't need product
			setAddressValidated(false);
		}
	}, [productOwnership]);

	// Handle reason text change and update character count
	const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const text = e.target.value;
		// Limit to 500 characters
		if (text.length <= 500) {
			setReason(text);
			setCharCount(text.length);
		}
	};

	// Function to validate the address and determine if we can ship
	const validateAddress = () => {
		// First check if required fields are filled
		if (!addressLine1 || !city || !state || !zipCode || !country) {
			return false;
		}

		// Here you would implement logic to determine if shipping is possible
		// This is a simplified example - in a real app, you might call an API
		const cannotShipStates = ["HI", "AK", "PR"];
		const cannotShipCountries = ["Other"];
		
		// Basic validation for demo purposes
		const stateUpper = state.toUpperCase();
		const canShipToAddress = 
			!cannotShipStates.includes(stateUpper) && 
			!cannotShipCountries.includes(country);
		
		setCanShip(canShipToAddress);
		setAddressValidated(true);
		
		return true;
	};

	const handleAddressChange = () => {
		// Reset validation state when address is changed
		if (addressValidated) {
			setAddressValidated(false);
		}
	};

	const handleSubmit = async () => {
		if (!currentUser) {
			setError("You must be logged in to apply.");
			return;
		}

		if (reason.trim().length < 10) {
			setError("Please provide a detailed reason why you should be selected.");
			return;
		}

		if (productOwnership === "need") {
			// Validate address first
			const isAddressValid = validateAddress();
			
			if (!isAddressValid) {
				setError("Please complete all required shipping address fields.");
				return;
			}
			
			if (!canShip) {
				setError("Unfortunately, we cannot ship to this address.");
				return;
			}
		}

		try {
			setIsSubmitting(true);
			setError("");

			// Create shipping address object if needed
			const shippingAddress = productOwnership === "need"
				? {
						addressLine1,
						addressLine2,
						city,
						state,
						zipCode,
						country,
					}
				: null;

			// Create application data to send to API
			const applicationData = {
				userId: currentUser.uid,
				projectId,
				reason,
				productOwnership,
				deliveryTime,
				shippingAddress,
				canShip: productOwnership === "need" ? canShip : true,
				status: "pending",
			};

			// Submit to API endpoint
			const response = await fetch("/api/projects/apply", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(applicationData),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to submit application");
			}

			setSuccess(true);
			toast.success("Application submitted successfully!");
			
			// Show success modal
			setShowSuccessModal(true);
		} catch (err) {
			console.error("Error submitting application:", err);
			setError("Failed to submit application. Please try again.");
			toast.error("Failed to submit application. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSuccessModalClose = () => {
		setShowSuccessModal(false);
		onClose();
		
		if (onSubmitSuccess) {
			onSubmitSuccess();
		}
	};

	const handleVerifyAddress = () => {
		validateAddress();
	};

	if (!isOpen) return null;
	
	if (showSuccessModal) {
		return (
			<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
				<ApplicationSuccessModal 
					isOpen={true}
					onClose={handleSuccessModalClose}
					message="Your application has been submitted for review. We'll notify you once it's approved."
				/>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
			<div className="bg-white rounded-xl w-full max-w-xl shadow-lg my-8 relative font-satoshi">
				<div className="p-6">
					<button
						onClick={onClose}
						className="absolute top-5 right-5 text-gray-500 hover:text-gray-700"
						aria-label="Close"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>

					<div className="text-center mb-4">
						<h2 className="text-xl font-bold mb-2">Apply to This Project</h2>
						<p className="text-gray-500">
							Fill in the required details to submit your application for this
							contest.
						</p>
					</div>

					<div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
						{/* Error message */}
						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						{/* Why should you be selected? */}
						<div className="space-y-2">
							<h3 className="text-base font-medium">
								Why should you be selected?
							</h3>
							<Textarea
								placeholder="Hi Social Shake, I'm thrilled about the opportunity to participate in your contest! As a content creator with 10,000 Followers and an engagement rate of 60%, I've honed my skills in crafting TikTok videos that are not only visually appealing but also"
								value={reason}
								onChange={handleReasonChange}
								className="min-h-32"
								maxLength={500}
							/>
							<div className="flex justify-start">
								
								<p className={`text-sm ${charCount > 450 ? (charCount > 480 ? "text-red-500" : "text-orange-500") : "text-gray-500"}`}>
									{charCount}/500
								</p>
							</div>
						</div>

						{/* Product ownership */}
						<div className="space-y-3">
							<h3 className="text-base font-medium">
								Do you own the product already, or will you need it shipped?
							</h3>
							<RadioGroup
								value={productOwnership}
								onValueChange={setProductOwnership}
								className="flex flex-wrap gap-3 mt-2"
							>
								<div
									className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-6 py-2 rounded-lg data-[state=checked]:bg-[#f26f38] data-[state=checked]:text-[#fff] data-[state=checked]:border-none"
									data-state={productOwnership === "own" ? "checked" : "unchecked"}
								>
									<RadioGroupItem value="own" id="own" />
									<Label htmlFor="own" className="cursor-pointer">
										I Own It
									</Label>
								</div>
								<div
									className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-6 py-2 rounded-lg data-[state=checked]:bg-[#f26f38] data-[state=checked]:text-[#fff] data-[state=checked]:border-none"
									data-state={productOwnership === "need" ? "checked" : "unchecked"}
								>
									<RadioGroupItem value="need" id="need" />
									<Label htmlFor="need" className="cursor-pointer">
										I Need It
									</Label>
								</div>
							</RadioGroup>
						</div>

						{/* Shipping Address Form */}
						{showShippingForm && (
							<div className="space-y-4 border p-4 rounded-lg bg-gray-50">
								<h3 className="text-base font-medium">Shipping Address</h3>

								<div className="space-y-3">
									<div>
										<Label htmlFor="addressLine1">Address Line 1 *</Label>
										<Input
											id="addressLine1"
											value={addressLine1}
											onChange={(e) => {
												setAddressLine1(e.target.value);
												handleAddressChange();
											}}
											placeholder="Street address"
											className="w-full"
										/>
									</div>

									<div>
										<Label htmlFor="addressLine2">Address Line 2</Label>
										<Input
											id="addressLine2"
											value={addressLine2}
											onChange={(e) => {
												setAddressLine2(e.target.value);
												handleAddressChange();
											}}
											placeholder="Apartment, suite, unit, etc. (optional)"
											className="w-full"
										/>
									</div>

									<div className="grid grid-cols-2 gap-3">
										<div>
											<Label htmlFor="city">City *</Label>
											<Input
												id="city"
												value={city}
												onChange={(e) => {
													setCity(e.target.value);
													handleAddressChange();
												}}
												placeholder="City"
												className="w-full"
											/>
										</div>

										<div>
											<Label htmlFor="state">State/Province *</Label>
											<Input
												id="state"
												value={state}
												onChange={(e) => {
													setState(e.target.value);
													handleAddressChange();
												}}
												placeholder="State"
												className="w-full"
											/>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-3">
										<div>
											<Label htmlFor="zipCode">ZIP/Postal Code *</Label>
											<Input
												id="zipCode"
												value={zipCode}
												onChange={(e) => {
													setZipCode(e.target.value);
													handleAddressChange();
												}}
												placeholder="ZIP Code"
												className="w-full"
											/>
										</div>

										<div>
											<Label htmlFor="country">Country *</Label>
											<Select 
												value={country} 
												onValueChange={(value) => {
													setCountry(value);
													handleAddressChange();
												}}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select country" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="United States">
														United States
													</SelectItem>
													<SelectItem value="Canada">Canada</SelectItem>
													<SelectItem value="United Kingdom">
														United Kingdom
													</SelectItem>
													<SelectItem value="Australia">Australia</SelectItem>
													<SelectItem value="Germany">Germany</SelectItem>
													<SelectItem value="France">France</SelectItem>
													<SelectItem value="Other">Other</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>

									<div className="flex justify-between items-center mt-2">
										<Button
											type="button"
											onClick={handleVerifyAddress}
											variant="outline"
											className="text-orange-500 border-orange-500 hover:bg-orange-50"
											disabled={!addressLine1 || !city || !state || !zipCode || !country}
										>
											Verify Address
										</Button>
										
										{addressValidated && (
											<div className={`text-sm ${canShip ? 'text-green-600' : 'text-red-500'} font-medium`}>
												{canShip 
													? "We can ship to this address" 
													: "We cannot ship to this address"}
											</div>
										)}
									</div>
								</div>
							</div>
						)}

						{/* Delivery time */}
						<div className="space-y-3">
							<h3 className="text-base font-medium">
								{productOwnership === "need"
									? "How soon can you deliver the content once the product has been shipped?"
									: "How soon can you deliver the content if approved?"}
							</h3>
							<Select value={deliveryTime} onValueChange={setDeliveryTime}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select a time frame" />
								</SelectTrigger>
								<SelectContent className="bg-[#f7f7f7]">
									<SelectItem value="1-3 days">1-3 days</SelectItem>
									<SelectItem value="4-7 days">4-7 days</SelectItem>
									<SelectItem value="1-2 weeks">1-2 weeks</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Submit button */}
					<Button
						type="button"
						onClick={handleSubmit}
						disabled={isSubmitting || (productOwnership === "need" && addressValidated && !canShip)}
						className={`w-full mt-6 ${
							(productOwnership === "need" && addressValidated && !canShip) 
								? "bg-orange-300 cursor-not-allowed" 
								: "bg-orange-500 hover:bg-orange-600"
						} text-white`}
					>
						{isSubmitting ? (
							<span className="flex items-center">
								<svg
									className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Processing...
							</span>
						) : (
							"Submit Application"
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
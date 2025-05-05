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
import { countries } from "@/types/countries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface ShippingAddress {
	userId: string;
	id: string;
	name: string;
	addressLine1: string;
	addressLine2?: string;
	city: string;
	state: string;
	country: string;
	zipCode: string;
	phoneNumber: string;
	isDefault: boolean;
	createdAt: string;
}

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
	const { currentUser, getIdToken } = useAuth();
	const [reason, setReason] = useState("");
	const [productOwnership, setProductOwnership] = useState("need");
	const [deliveryTime, setDeliveryTime] = useState("1-3 days");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [, setSuccess] = useState(false);
	const [showShippingForm, setShowShippingForm] = useState(true);
	const [canShip, setCanShip] = useState(true);
	const [addressValidated, setAddressValidated] = useState(false);
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [charCount, setCharCount] = useState(0);
	const [activeTab, setActiveTab] = useState("existing");

	// User's existing addresses
	const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
	const [selectedAddressId, setSelectedAddressId] = useState("");
	const [loadingAddresses, setLoadingAddresses] = useState(false);

	// New address fields
	const [name, setName] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [addressLine1, setAddressLine1] = useState("");
	const [addressLine2, setAddressLine2] = useState("");
	const [city, setCity] = useState("");
	const [state, setState] = useState("");
	const [zipCode, setZipCode] = useState("");
	const [country, setCountry] = useState("United States");
	const [isDefault, setIsDefault] = useState(false);
	const [deliveryInstructions, setDeliveryInstructions] = useState("");

	// Fetch user's existing shipping addresses
	useEffect(() => {
		async function fetchAddresses() {
			if (!currentUser || !isOpen) return;

			try {
				setLoadingAddresses(true);
				const token = getIdToken ? await getIdToken() : null;
				const response = await fetch("/api/shipping-addresses", {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				if (response.ok) {
					const data = await response.json();
					setAddresses(data);

					// Set default address if available
					const defaultAddress = data.find(
						(addr: ShippingAddress) => addr.isDefault
					);
					if (defaultAddress) {
						setSelectedAddressId(defaultAddress.id);
						setAddressValidated(true);
						setCanShip(true); // Assume we can ship to existing addresses
					} else if (data.length > 0) {
						setSelectedAddressId(data[0].id);
						setAddressValidated(true);
						setCanShip(true);
					} else {
						// No addresses found, switch to new address tab
						setActiveTab("new");
					}
				}
			} catch (err) {
				console.error("Error fetching addresses:", err);
				toast.error("Failed to load your shipping addresses");
			} finally {
				setLoadingAddresses(false);
			}
		}

		fetchAddresses();
	}, [currentUser, isOpen, getIdToken]);

	// Reset form when modal opens/closes
	useEffect(() => {
		if (isOpen) {
			setReason("");
			setCharCount(0);
			setProductOwnership("need");
			setDeliveryTime("1-3 days");
			setShowShippingForm(true);
			setError("");
			setSuccess(false);
			setShowSuccessModal(false);
			setAddressValidated(false);
			setCanShip(true);
			setActiveTab(addresses.length > 0 ? "existing" : "new");

			// Reset new address form
			setName("");
			setPhoneNumber("");
			setAddressLine1("");
			setAddressLine2("");
			setCity("");
			setState("");
			setZipCode("");
			setCountry("United States");
			setIsDefault(false);
		}
	}, [isOpen, addresses.length]);

	// Toggle shipping form visibility based on product ownership
	useEffect(() => {
		if (productOwnership === "need") {
			setShowShippingForm(true);
		} else {
			setShowShippingForm(false);
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

	// Create a new shipping address
	const createShippingAddress = async () => {
		if (!currentUser) return null;

		// Validate required fields
		if (
			!name ||
			!phoneNumber ||
			!addressLine1 ||
			!city ||
			!state ||
			!zipCode ||
			!country
		) {
			setError("Please fill in all required address fields");
			return null;
		}

		try {
			const token = getIdToken ? await getIdToken() : null;
			const response = await fetch("/api/shipping-addresses", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					name,
					phoneNumber,
					addressLine1,
					addressLine2,
					city,
					state,
					zipCode,
					country,
					isDefault,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to create shipping address");
			}

			const newAddress = await response.json();

			// Add the new address to the addresses list
			setAddresses((prev) => [newAddress, ...prev]);

			// Select the new address
			setSelectedAddressId(newAddress.id);
			setAddressValidated(true);
			setCanShip(true); // Assume we can ship to the address
			setActiveTab("existing");

			return newAddress.id;
		} catch (err) {
			console.error("Error creating shipping address:", err);
			setError("Failed to create shipping address. Please try again.");
			return null;
		}
	};

	// Function to validate shipping can be done to an address
	const validateAddress = () => {
		if (activeTab === "existing") {
			// For existing addresses, we assume they're valid if selected
			return !!selectedAddressId;
		} else {
			// For new addresses, check required fields
			if (
				!name ||
				!phoneNumber ||
				!addressLine1 ||
				!city ||
				!state ||
				!zipCode ||
				!country
			) {
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
		}
	};

	const handleVerifyAddress = () => {
		validateAddress();
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

		let shippingAddressId = null;

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

			// Get shipping address ID (either selected or create new)
			if (activeTab === "existing") {
				shippingAddressId = selectedAddressId;
			} else {
				// Create new address and get its ID
				const newAddressId = await createShippingAddress();
				if (!newAddressId) {
					// Error already shown by createShippingAddress
					return;
				}
				shippingAddressId = newAddressId;
			}
		}

		try {
			setIsSubmitting(true);
			setError("");

			// Get auth token
			const token = getIdToken ? await getIdToken() : null;

			// Create application data to send to API
			const applicationData = {
				projectId,
				reason,
				productOwnership,
				deliveryTime,
				shippingAddressId, // Send only the ID instead of the full address
				canShip: productOwnership === "need" ? canShip : true,
			};

			// Submit to API endpoint
			const response = await fetch("/api/projects/apply", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
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
								<p
									className={`text-sm ${charCount > 450 ? (charCount > 480 ? "text-red-500" : "text-orange-500") : "text-gray-500"}`}
								>
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
									data-state={
										productOwnership === "own" ? "checked" : "unchecked"
									}
								>
									<RadioGroupItem value="own" id="own" />
									<Label htmlFor="own" className="cursor-pointer">
										I Own It
									</Label>
								</div>
								<div
									className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-6 py-2 rounded-lg data-[state=checked]:bg-[#f26f38] data-[state=checked]:text-[#fff] data-[state=checked]:border-none"
									data-state={
										productOwnership === "need" ? "checked" : "unchecked"
									}
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

								<Tabs
									value={activeTab}
									onValueChange={setActiveTab}
									className="w-full"
								>
									<TabsList className="grid grid-cols-2 mb-4">
										<TabsTrigger
											value="existing"
											disabled={addresses.length === 0}
										>
											Saved Addresses
										</TabsTrigger>
										<TabsTrigger value="new">New Address</TabsTrigger>
									</TabsList>

									<TabsContent value="existing" className="mt-2">
										{loadingAddresses ? (
											<div className="text-center py-4">
												<svg
													className="animate-spin h-5 w-5 text-orange-500 mx-auto"
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
												<p className="mt-2 text-sm text-gray-500">
													Loading your addresses...
												</p>
											</div>
										) : addresses.length === 0 ? (
											<div className="text-center py-4">
												<p className="text-sm text-gray-500">
													You don&apos;t have any saved addresses.
												</p>
												<Button
													onClick={() => setActiveTab("new")}
													variant="outline"
													className="mt-2 text-orange-500 border-orange-500 hover:bg-orange-50"
												>
													Add a new address
												</Button>
											</div>
										) : (
											<div className="space-y-3">
												{addresses.map((address) => (
													<div
														key={address.id}
														className={`border p-3 rounded-lg cursor-pointer ${
															selectedAddressId === address.id
																? "border-orange-500 bg-orange-50"
																: "border-gray-200"
														}`}
														onClick={() => {
															setSelectedAddressId(address.id);
															setAddressValidated(true);
															setCanShip(true);
														}}
													>
														<div className="flex justify-between">
															<h4 className="font-medium">
																{address.name}{" "}
																{address.isDefault && (
																	<span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full ml-2">
																		Default
																	</span>
																)}
															</h4>
															<RadioGroup>
																<RadioGroupItem
																	value={address.id}
																	checked={selectedAddressId === address.id}
																	className="mt-1"
																/>
															</RadioGroup>
														</div>
														<p className="text-sm text-gray-600">
															{address.addressLine1}
															{address.addressLine2 &&
																`, ${address.addressLine2}`}
														</p>
														<p className="text-sm text-gray-600">
															{address.city}, {address.state} {address.zipCode}
														</p>
														<p className="text-sm text-gray-600">
															{address.country}
														</p>
														<p className="text-sm text-gray-600 mt-1">
															{address.phoneNumber}
														</p>
													</div>
												))}
											</div>
										)}
									</TabsContent>

									<TabsContent value="new" className="mt-2">
										<div className="space-y-3">
											<div className="grid grid-cols-2 gap-3">
												<div>
													<Label htmlFor="name">Full Name *</Label>
													<Input
														id="name"
														value={name}
														onChange={(e) => setName(e.target.value)}
														placeholder="John Doe"
														className="w-full"
													/>
												</div>
												<div>
													<Label htmlFor="phoneNumber">Phone Number *</Label>
													<Input
														id="phoneNumber"
														value={phoneNumber}
														onChange={(e) => setPhoneNumber(e.target.value)}
														placeholder="(123) 456-7890"
														className="w-full"
													/>
												</div>
											</div>

											<div>
												<Label htmlFor="addressLine1">Address Line 1 *</Label>
												<Input
													id="addressLine1"
													value={addressLine1}
													onChange={(e) => {
														setAddressLine1(e.target.value);
														setAddressValidated(false);
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
														setAddressValidated(false);
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
															setAddressValidated(false);
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
															setAddressValidated(false);
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
															setAddressValidated(false);
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
															setAddressValidated(false);
														}}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select a country" />
														</SelectTrigger>
														<SelectContent className="bg-[#f7f7f7]">
															{countries.map((country) => (
																<SelectItem
																	key={country.code}
																	value={country.name}
																>
																	{country.name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</div>
											</div>
											{/* Delivery Instructions */}
											<div>
												<Label htmlFor="deliveryInstructions">
													Delivery Instructions
												</Label>
												<Textarea
													id="deliveryInstructions"
													value={deliveryInstructions}
													onChange={(e) => {
														setDeliveryInstructions(e.target.value);
														setAddressValidated(false);
													}}
													placeholder="Any specific instructions for delivery?"
													className="w-full"
												/>
											</div>

											<div className="flex items-center space-x-2 mt-2">
												<input
													type="checkbox"
													id="isDefault"
													checked={isDefault}
													onChange={(e) => setIsDefault(e.target.checked)}
													className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
												/>
												<Label htmlFor="isDefault" className="text-sm">
													Set as default address
												</Label>
											</div>

											<div className="flex justify-between items-center mt-2">
												<Button
													type="button"
													onClick={handleVerifyAddress}
													variant="outline"
													className="text-orange-500 border-orange-500 hover:bg-orange-50"
													disabled={
														!name ||
														!phoneNumber ||
														!addressLine1 ||
														!city ||
														!state ||
														!zipCode ||
														!country
													}
												>
													Verify Address
												</Button>

												{addressValidated && (
													<div
														className={`text-sm ${canShip ? "text-green-600" : "text-red-500"} font-medium`}
													>
														{canShip
															? "We can ship to this address"
															: "We cannot ship to this address"}
													</div>
												)}
											</div>
										</div>
									</TabsContent>
								</Tabs>
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
						disabled={
							isSubmitting ||
							(productOwnership === "need" && addressValidated && !canShip)
						}
						className={`w-full mt-6 ${
							productOwnership === "need" && addressValidated && !canShip
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

import { useState, useEffect } from "react";
import { auth } from "@/config/firebase";
import { PlusIcon, TrashIcon, PencilIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	fetchPaymentMethods,
	addPaymentMethod,
	updatePaymentMethod,
	deletePaymentMethod,
	setDefaultPaymentMethod,
} from "@/services/paymentMethodService";
import axios from "axios";
import Image from "next/image";
import StripeConnect from "../StripeConnect";

// Types for our payment methods
type PaymentMethod = {
	id: string;
	type: "bank" | "paypal" | "card";
	isDefault: boolean;
	lastUpdated: Date;
	// Bank specific
	bankName?: string;
	accountNumber?: string;
	accountHolderName?: string;
	routingNumber?: string;
	accountEnding?: string;

	// User-specific
	userId?: string;
	// PayPal specific
	paypalEmail?: string;
	// Card specific
	cardType?: string;
	cardEnding?: string;
	expiryDate?: string;
};

const Payout = () => {
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [selectedPaymentType, setSelectedPaymentType] = useState<
		"bank" | "paypal" | "card"
	>("bank");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [editingPaymentMethod, setEditingPaymentMethod] =
		useState<PaymentMethod | null>(null);
	const [activeTab, setActiveTab] = useState("payment-methods");
	const [disconnecting, setDisconnecting] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);

	// Form states
	const [accountHolderName, setAccountHolderName] = useState("");
	const [bankName, setBankName] = useState("");
	const [routingNumber, setRoutingNumber] = useState("");
	const [accountNumber, setAccountNumber] = useState("");
	const [paypalEmail, setPaypalEmail] = useState("");
	const [setAsDefault, setSetAsDefault] = useState(false);
	const [cardNumber, setCardNumber] = useState("");
	const [expiryDate, setExpiryDate] = useState("");
	const [cvv, setCvv] = useState("");
	const [cardholderName, setCardholderName] = useState("");

	// Fetch payment methods on component mount
	useEffect(() => {
		getPaymentMethods();
	}, []);

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

	const getPaymentMethods = async () => {
		try {
			setIsLoading(true);
			setError("");

			const methods = await fetchPaymentMethods();
			setPaymentMethods(methods);
		} catch (err) {
			console.error("Error fetching payment methods:", err);
			setError("Failed to load payment methods. Please try again later.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleAddPaymentMethod = async () => {
		try {
			setIsLoading(true);
			setError("");

			// Create payment method object based on selected type
			let paymentMethodData: Partial<PaymentMethod> = {
				type: selectedPaymentType,
				isDefault: setAsDefault,
				lastUpdated: new Date(),
				userId: auth.currentUser?.uid,
			};

			switch (selectedPaymentType) {
				case "bank":
					// For bank accounts, we only store the last 4 digits of the account number
					paymentMethodData = {
						...paymentMethodData,
						bankName,
						accountHolderName,
						routingNumber: routingNumber
							? `****${routingNumber.slice(-4)}`
							: "",
						accountEnding: accountNumber
							? `****${accountNumber.slice(-4)}`
							: "",
					};
					break;

				case "paypal":
					paymentMethodData = {
						...paymentMethodData,
						paypalEmail,
					};
					break;

				case "card":
					// For cards, we only store the last 4 digits
					paymentMethodData = {
						...paymentMethodData,
						cardType: "Visa", // In a real app, you'd detect this from the card number
						cardEnding: cardNumber ? `${cardNumber.slice(-4)}` : "",
						expiryDate,
						accountHolderName: cardholderName,
					};
					break;
			}

			await addPaymentMethod(paymentMethodData);

			// Clear form and close modal
			resetForm();
			setIsAddModalOpen(false);
			setSuccess("Payment method added successfully");

			// Refresh payment methods list
			getPaymentMethods();
		} catch (err) {
			setError("Failed to add payment method. Please try again.");
			console.error("Error adding payment method:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleEditPaymentMethod = async () => {
		if (!editingPaymentMethod) return;

		try {
			setIsLoading(true);
			setError("");

			let updatedPaymentData: Partial<PaymentMethod> = {
				lastUpdated: new Date(),
				isDefault: setAsDefault,
			};

			switch (selectedPaymentType) {
				case "bank":
					updatedPaymentData = {
						...updatedPaymentData,
						bankName,
						accountHolderName,
						routingNumber: routingNumber
							? `****${routingNumber.slice(-4)}`
							: editingPaymentMethod.routingNumber,
						accountEnding: accountNumber
							? `****${accountNumber.slice(-4)}`
							: editingPaymentMethod.accountEnding,
					};
					break;

				case "paypal":
					updatedPaymentData = {
						...updatedPaymentData,
						paypalEmail,
					};
					break;

				case "card":
					updatedPaymentData = {
						...updatedPaymentData,
						cardType: "Visa",
						cardEnding: cardNumber
							? `${cardNumber.slice(-4)}`
							: editingPaymentMethod.cardEnding,
						expiryDate: expiryDate || editingPaymentMethod.expiryDate,
						accountHolderName:
							cardholderName || editingPaymentMethod.accountHolderName,
					};
					break;
			}

			await updatePaymentMethod(editingPaymentMethod.id, updatedPaymentData);

			resetForm();
			setIsEditModalOpen(false);
			setEditingPaymentMethod(null);
			setSuccess("Payment method updated successfully");

			// Refresh payment methods
			getPaymentMethods();
		} catch (err) {
			setError("Failed to update payment method. Please try again.");
			console.error("Error updating payment method:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSetDefault = async (id: string) => {
		try {
			setIsLoading(true);
			setError("");

			// Check if the method is already default
			const method = paymentMethods.find((m) => m.id === id);
			if (method && method.isDefault) {
				setIsLoading(false);
				return; // Already default, do nothing
			}

			await setDefaultPaymentMethod(id);

			setSuccess("Default payment method updated");

			// Update local state
			const updatedMethods = paymentMethods.map((method) => ({
				...method,
				isDefault: method.id === id,
			}));

			setPaymentMethods(updatedMethods);
		} catch (err) {
			setError("Failed to update default payment method");
			console.error("Error setting default payment method:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeletePaymentMethod = async (id: string) => {
		try {
			setIsLoading(true);
			setError("");

			await deletePaymentMethod(id);

			setSuccess("Payment method deleted successfully");
			// Update local state
			setPaymentMethods((prev) => prev.filter((method) => method.id !== id));
		} catch (err) {
			setError("Failed to delete payment method");
			console.error("Error deleting payment method:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleEditClick = (method: PaymentMethod) => {
		setEditingPaymentMethod(method);
		setSelectedPaymentType(method.type);
		setSetAsDefault(method.isDefault);

		// Populate form fields based on payment type
		switch (method.type) {
			case "bank":
				setBankName(method.bankName || "");
				setAccountHolderName(method.accountHolderName || "");
				// We don't pre-fill sensitive info like routing/account numbers
				break;
			case "paypal":
				setPaypalEmail(method.paypalEmail || "");
				break;
			case "card":
				setCardholderName(method.accountHolderName || "");
				// We don't pre-fill card number
				setExpiryDate(method.expiryDate || "");
				break;
		}

		setIsEditModalOpen(true);
	};

	const resetForm = () => {
		setAccountHolderName("");
		setBankName("");
		setRoutingNumber("");
		setAccountNumber("");
		setPaypalEmail("");
		setCardNumber("");
		setExpiryDate("");
		setCvv("");
		setCardholderName("");
		setSetAsDefault(false);
	};

	const handleDisconnectStripe = async () => {
		if (!auth.currentUser?.uid) return;
		
		try {
			setDisconnecting(true);
			setError("");
			
			// Call your disconnect endpoint
			await axios.post("/api/creator/disconnect-stripe-account", {
				userId: auth.currentUser.uid
			});
			
			// Force refresh the StripeConnect component to show the connect button again
			setRefreshKey(prev => prev + 1);
			setSuccess("Stripe account disconnected successfully");
			
		} catch (err) {
			console.error("Error disconnecting Stripe account:", err);
			setError("Failed to disconnect your Stripe account. Please try again.");
		} finally {
			setDisconnecting(false);
		}
	};

	// Use fetched data, fallback to mock data if empty
	const displayPaymentMethods = paymentMethods.length > 0 && paymentMethods;

	return (
		<div className="border border-[#FFD9C3] rounded-lg p-6">
			<h2 className="text-2xl font-medium mb-1">Payments & Payouts</h2>
			<p className="text-gray-500 mb-2">
				Manage how you receive earnings from campaigns & contests
			</p>
			<hr className="my-4" />

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

			<Tabs defaultValue="payment-methods" value={activeTab} onValueChange={setActiveTab} className="mt-4">
				<TabsList className="grid w-full max-w-md grid-cols-2">
					<TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
					<TabsTrigger value="stripe-connect">Stripe Connect</TabsTrigger>
				</TabsList>

				{/* Payment Methods Tab Content */}
				<TabsContent value="payment-methods" className="mt-4">
					<div className="space-y-4">
						{Array.isArray(displayPaymentMethods) &&
							displayPaymentMethods.map((method) => (
								<div
									key={method.id}
									className="border rounded-lg p-4 flex items-center justify-between"
								>
									<div className="flex items-center space-x-4">
										{method.type === "bank" && (
											<div className="w-10 h-10 bg-gray-100 flex items-center justify-center rounded">
												<span className="text-xl">🏦</span>
											</div>
										)}
										{method.type === "paypal" && (
											<Image
												src="/icons/paypal.svg"
												alt="Paypal"
												width={30}
												height={30}
											/>
										)}
										{method.type === "card" && (
											<div className="w-10 h-10 bg-yellow-100 flex items-center justify-center rounded">
												<span className="text-xl">💳</span>
											</div>
										)}

										<div>
											{method.type === "bank" && (
												<>
													<div className="font-medium">{method.bankName}</div>
													<div className="text-sm text-gray-500">
														Account ending in {method.accountEnding}
													</div>
												</>
											)}
											{method.type === "paypal" && (
												<>
													<div className="font-medium">Paypal</div>
													{method.paypalEmail && (
														<div className="text-sm text-gray-500">
															{method.paypalEmail}
														</div>
													)}
												</>
											)}
											{method.type === "card" && (
												<>
													<div className="font-medium">{method.cardType}</div>
													<div className="text-sm text-gray-500">
														Card ending in {method.cardEnding} (Expires:{" "}
														{method.expiryDate})
													</div>
												</>
											)}
										</div>
									</div>

									<div className="flex items-center space-x-2">
										{method.isDefault ? (
											<span className="text-sm text-[#20D5EC] bg-[#F1FEFB] px-3 py-1 rounded-full">
												Default
											</span>
										) : (
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleSetDefault(method.id)}
												disabled={isLoading}
												className="bg-[#6670854D] rounded-full font-light"
											>
												Make Default
											</Button>
										)}
										<Button
											variant="outline"
											size="icon"
											onClick={() => handleEditClick(method)}
										>
											<PencilIcon className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="icon"
											onClick={() => handleDeletePaymentMethod(method.id)}
											disabled={isLoading}
										>
											<TrashIcon className="h-4 w-4" />
										</Button>
									</div>
								</div>
							))}

						<div className="flex justify-end mt-3">
							<Button
								onClick={() => setIsAddModalOpen(true)}
								className="flex items-center py-5 bg-black text-white"
								variant="outline"
							>
								<PlusIcon className="mr-1 h-5 w-5" /> Add Payment Method
							</Button>
						</div>
					</div>
				</TabsContent>

				{/* Stripe Connect Tab Content */}
				<TabsContent value="stripe-connect" className="mt-4">
					<div className="border rounded-lg p-6 space-y-4">
						<div>
							<h3 className="text-xl font-medium mb-2">Stripe Connect</h3>
							<p className="text-gray-500">
								Connect your Stripe account to receive payments
							</p>
						</div>
						
						<div key={refreshKey}>
							<StripeConnect
								userId={auth.currentUser?.uid}
								redirectPath="/creator/dashboard/settings"
								testMode={true}
							/>
						</div>
						
						{/* Disconnect button - shown conditionally based on connected state */}
						<div className="mt-6 pt-4 border-t border-gray-200">
							<Button  
								variant="destructive" 
								onClick={handleDisconnectStripe} 
								disabled={disconnecting} 
								className="mt-2 bg-red-500 text-white hover:bg-red-600" 
							> 
								{disconnecting ? "Disconnecting..." : "Disconnect Stripe Account"} 
							</Button> 
							<p className="text-xs text-red-600 mt-2"> 
								Warning: Disconnecting your Stripe account will prevent you from receiving payments 
							</p> 
						</div>
					</div>
				</TabsContent>
			</Tabs>

			{/* Add New Payment Method Modal (using divs instead of Dialog) */}
			{isAddModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg max-w-md w-full p-6">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-xl font-bold">Add New Payment Method</h2>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setIsAddModalOpen(false)}
							>
								<XIcon className="h-5 w-5" />
							</Button>
						</div>

						<div className="py-4">
							<div className="mb-4">
								<label className="block text-sm font-medium mb-1">
									Select your Payment Method
								</label>
								<Select
									value={selectedPaymentType}
									onValueChange={(value) =>
										setSelectedPaymentType(value as "bank" | "paypal" | "card")
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select payment method" />
									</SelectTrigger>
									<SelectContent className="bg-[#f7f7f7]">
										<SelectItem value="bank">Bank</SelectItem>
										<SelectItem value="paypal">Paypal</SelectItem>
										<SelectItem value="card">Credit/Debit Card</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{selectedPaymentType === "bank" && (
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium mb-1">
											Account Holder Name
										</label>
										<Input
											value={accountHolderName}
											onChange={(e) => setAccountHolderName(e.target.value)}
											placeholder="Jane Doe"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-1">
											Bank Name
										</label>
										<Input
											value={bankName}
											onChange={(e) => setBankName(e.target.value)}
											placeholder="Bank of America"
										/>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium mb-1">
												Routing Number
											</label>
											<Input
												value={routingNumber}
												onChange={(e) => setRoutingNumber(e.target.value)}
												placeholder="123456789"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium mb-1">
												Account Number
											</label>
											<Input
												value={accountNumber}
												onChange={(e) => setAccountNumber(e.target.value)}
												placeholder="1234567890"
											/>
										</div>
									</div>
								</div>
							)}

							{selectedPaymentType === "paypal" && (
								<div>
									<label className="block text-sm font-medium mb-1">
										PayPal Email
									</label>
									<Input
										value={paypalEmail}
										onChange={(e) => setPaypalEmail(e.target.value)}
										placeholder="your-email@example.com"
										type="email"
									/>
								</div>
							)}

							{selectedPaymentType === "card" && (
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium mb-1">
											Cardholder Name
										</label>
										<Input
											value={cardholderName}
											onChange={(e) => setCardholderName(e.target.value)}
											placeholder="Jane Doe"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-1">
											Card Number
										</label>
										<Input
											value={cardNumber}
											onChange={(e) => setCardNumber(e.target.value)}
											placeholder="1234 5678 9012 3456"
										/>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium mb-1">
												Expiry Date
											</label>
											<Input
												value={expiryDate}
												onChange={(e) => setExpiryDate(e.target.value)}
												placeholder="MM/YY"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium mb-1">
												CVV
											</label>
											<Input
												value={cvv}
												onChange={(e) => setCvv(e.target.value)}
												placeholder="123"
												maxLength={4}
											/>
										</div>
									</div>
								</div>
							)}

							<div className="flex items-center space-x-2 mt-4">
								<Checkbox
									id="setAsDefault"
									checked={setAsDefault}
									onCheckedChange={(checked) =>
										setSetAsDefault(checked as boolean)
									}
								/>
								<label htmlFor="setAsDefault" className="text-sm">
									Set as default payment method
								</label>
							</div>
						</div>

						<div className="flex justify-between">
							<Button
								variant="outline"
								onClick={() => setIsAddModalOpen(false)}
							>
								Cancel
							</Button>
							<Button
								onClick={handleAddPaymentMethod}
								disabled={isLoading}
								className="text-white bg-black"
							>
								{isLoading
									? "Adding..."
									: `Add ${
											selectedPaymentType === "bank"
												? "Bank Account"
												: selectedPaymentType === "paypal"
													? "PayPal"
													: "Card"
										}`}
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Edit Payment Method Modal (using divs instead of Dialog) */}
			{isEditModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg max-w-md w-full p-6">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-xl font-bold">Edit Payment Method</h2>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => {
									setIsEditModalOpen(false);
									setEditingPaymentMethod(null);
									resetForm();
								}}
							>
								<XIcon className="h-5 w-5" />
							</Button>
						</div>

						<div className="py-4">
							<div className="mb-4">
								<label className="block text-sm font-medium mb-1">
									Payment Method Type
								</label>
								<div className="text-sm font-medium py-2">
									{selectedPaymentType === "bank"
										? "Bank Account"
										: selectedPaymentType === "paypal"
											? "PayPal"
											: "Credit/Debit Card"}
								</div>
							</div>

							{selectedPaymentType === "bank" && (
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium mb-1">
											Account Holder Name
										</label>
										<Input
											value={accountHolderName}
											onChange={(e) => setAccountHolderName(e.target.value)}
											placeholder="Jane Doe"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-1">
											Bank Name
										</label>
										<Input
											value={bankName}
											onChange={(e) => setBankName(e.target.value)}
											placeholder="Bank of America"
										/>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium mb-1">
												New Routing Number (Optional)
											</label>
											<Input
												value={routingNumber}
												onChange={(e) => setRoutingNumber(e.target.value)}
												placeholder="Leave blank to keep current"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium mb-1">
												New Account Number (Optional)
											</label>
											<Input
												value={accountNumber}
												onChange={(e) => setAccountNumber(e.target.value)}
												placeholder="Leave blank to keep current"
											/>
										</div>
									</div>
								</div>
							)}

							{selectedPaymentType === "paypal" && (
								<div>
									<label className="block text-sm font-medium mb-1">
										PayPal Email
									</label>
									<Input
										value={paypalEmail}
										onChange={(e) => setPaypalEmail(e.target.value)}
										placeholder="your-email@example.com"
										type="email"
									/>
								</div>
							)}

							{selectedPaymentType === "card" && (
								<div className="space-y-4">
									<div>
										<label className="block text-sm font-medium mb-1">
											Cardholder Name
										</label>
										<Input
											value={cardholderName}
											onChange={(e) => setCardholderName(e.target.value)}
											placeholder="Jane Doe"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium mb-1">
											New Card Number (Optional)
										</label>
										<Input
											value={cardNumber}
											onChange={(e) => setCardNumber(e.target.value)}
											placeholder="Leave blank to keep current"
										/>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium mb-1">
												Expiry Date
											</label>
											<Input
												value={expiryDate}
												onChange={(e) => setExpiryDate(e.target.value)}
												placeholder="MM/YY"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium mb-1">
												New CVV (Optional)
											</label>
											<Input
												value={cvv}
												onChange={(e) => setCvv(e.target.value)}
												placeholder="Leave blank to keep current"
												maxLength={4}
											/>
										</div>
									</div>
								</div>
							)}

							<div className="flex items-center space-x-2 mt-4">
								<Checkbox
									id="editSetAsDefault"
									checked={setAsDefault}
									onCheckedChange={(checked) =>
										setSetAsDefault(checked as boolean)
									}
								/>
								<label htmlFor="editSetAsDefault" className="text-sm">
									Set as default payment method
								</label>
							</div>
						</div>

						<div className="flex justify-between">
							<Button
								variant="outline"
								onClick={() => {
									setIsEditModalOpen(false);
									setEditingPaymentMethod(null);
									resetForm();
								}}
							>
								Cancel
							</Button>
							<Button
								onClick={handleEditPaymentMethod}
								disabled={isLoading}
								className="bg-orange-500 text-white"
							>
								{isLoading ? "Saving..." : "Save Changes"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Payout;
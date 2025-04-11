import { useState, useEffect } from "react";
import {
	collection,
	addDoc,
	getDocs,
	doc,
	updateDoc,
	deleteDoc,
} from "firebase/firestore";
import { auth, db } from "@/config/firebase";
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

const BillingPayments = () => {
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
		fetchPaymentMethods();
	}, []);

	const fetchPaymentMethods = async () => {
		try {
			setIsLoading(true);
			setError("");

			const querySnapshot = await getDocs(collection(db, "paymentMethods"));
			const methods: PaymentMethod[] = [];

			querySnapshot.forEach((doc) => {
				methods.push({ id: doc.id, ...doc.data() } as PaymentMethod);
			});

			setPaymentMethods(methods);
		} catch (err) {
			console.error("Error fetching payment methods:", err);

			// Fallback to mock data if fetching fails
			setPaymentMethods(mockPaymentMethods);
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

			// If setting as default, update all other payment methods to not be default
			if (setAsDefault) {
				const defaultMethods = paymentMethods.filter(
					(method) => method.isDefault
				);
				for (const method of defaultMethods) {
					await updateDoc(doc(db, "paymentMethods", method.id), {
						isDefault: false,
					});
				}
			}

			// Add the new payment method to Firestore
			await addDoc(collection(db, "paymentMethods"), paymentMethodData);

			// Clear form and close modal
			resetForm();
			setIsAddModalOpen(false);
			setSuccess("Payment method added successfully");

			// Refresh payment methods list
			fetchPaymentMethods();
		} catch (err) {
			setError("Failed to add payment method");
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

			// If setting as default, update all other payment methods
			if (setAsDefault && !editingPaymentMethod.isDefault) {
				const defaultMethods = paymentMethods.filter(
					(method) => method.isDefault
				);
				for (const method of defaultMethods) {
					await updateDoc(doc(db, "paymentMethods", method.id), {
						isDefault: false,
					});
				}
			}

			// Update the payment method
			await updateDoc(
				doc(db, "paymentMethods", editingPaymentMethod.id),
				updatedPaymentData
			);

			resetForm();
			setIsEditModalOpen(false);
			setEditingPaymentMethod(null);
			setSuccess("Payment method updated successfully");

			// Refresh payment methods
			fetchPaymentMethods();
		} catch (err) {
			setError("Failed to update payment method");
			console.error("Error updating payment method:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSetDefault = async (id: string) => {
		try {
			setIsLoading(true);
			setError("");

			// Get current payment methods
			const currentMethods = [...paymentMethods];

			// Check if the method is already default
			const method = currentMethods.find((m) => m.id === id);
			if (method && method.isDefault) {
				setIsLoading(false);
				return; // Already default, do nothing
			}

			// Update Firestore: first set all to false, then set the selected one to true
			const batch = [];

			for (const method of currentMethods) {
				batch.push(
					updateDoc(doc(db, "paymentMethods", method.id), {
						isDefault: method.id === id,
					})
				);
			}

			await Promise.all(batch);

			// Update local state
			const updatedMethods = currentMethods.map((method) => ({
				...method,
				isDefault: method.id === id,
			}));

			setPaymentMethods(updatedMethods);
			setSuccess("Default payment method updated");
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

			// Check if we're deleting a default payment method
			const methodToDelete = paymentMethods.find((method) => method.id === id);

			if (methodToDelete) {
				await deleteDoc(doc(db, "paymentMethods", id));

				// If we deleted the default method and there are other methods,
				// set another one as default
				if (methodToDelete.isDefault && paymentMethods.length > 1) {
					const newDefault = paymentMethods.find((method) => method.id !== id);
					if (newDefault) {
						await updateDoc(doc(db, "paymentMethods", newDefault.id), {
							isDefault: true,
						});
					}
				}

				setSuccess("Payment method deleted successfully");
				// Update local state
				setPaymentMethods((prev) => prev.filter((method) => method.id !== id));
			}
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

	// Mock data for demonstration (these would usually come from the database)
	const mockPaymentMethods: PaymentMethod[] = [
		{
			id: "1",
			type: "bank",
			bankName: "Bank of America",
			accountEnding: "6789",
			isDefault: true,
			lastUpdated: new Date(),
		},
		{
			id: "2",
			type: "paypal",
			paypalEmail: "user@example.com",
			isDefault: false,
			lastUpdated: new Date(),
		},
		{
			id: "3",
			type: "card",
			cardType: "Visa",
			cardEnding: "4242",
			expiryDate: "05/26",
			isDefault: false,
			lastUpdated: new Date(),
		},
	];

	// Use fetched data, fallback to mock data if empty
	const displayPaymentMethods =
		paymentMethods.length > 0 ? paymentMethods : mockPaymentMethods;

	return (
		<div className="bg-white border border-[#FFD9C3] rounded-lg p-6">
			<h2 className="text-2xl font-medium mb-6">Billing & Payments</h2>
			<p className="text-gray-500">
				Manage your subscription and payment methods.
			</p>

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

			<div className="space-y-4">
				{displayPaymentMethods.map((method) => (
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
								<div className="w-10 h-10 bg-blue-100 flex items-center justify-center rounded">
									<span className="text-xl">P</span>
								</div>
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
								<span className="text-sm text-blue-500 bg-blue-50 px-3 py-1 rounded-full">
									Default
								</span>
							) : (
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleSetDefault(method.id)}
									disabled={isLoading}
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

				<Button
					onClick={() => setIsAddModalOpen(true)}
					className="w-full flex items-center justify-center py-6"
					variant="outline"
				>
					<PlusIcon className="mr-2 h-5 w-5" /> Add Payment Method
				</Button>
			</div>

			<div className="mt-6 flex justify-end">
				<Button>Save Changes</Button>
			</div>

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
									<SelectContent>
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
							<Button onClick={handleAddPaymentMethod} disabled={isLoading}>
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
							<Button onClick={handleEditPaymentMethod} disabled={isLoading}>
								{isLoading ? "Saving..." : "Save Changes"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default BillingPayments;

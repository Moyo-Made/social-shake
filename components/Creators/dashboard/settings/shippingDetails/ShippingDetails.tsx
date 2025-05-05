import { useState, useEffect } from "react";
import { Trash2, Edit, ChevronLeft } from "lucide-react";
import { useAuthApi } from "@/hooks/useAuthApi";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { countries } from "@/types/countries";
import { Textarea } from "@/components/ui/textarea";

// Define types
interface ShippingAddress {
	id: string;
	userId: string;
	name: string;
	addressLine1: string;
	addressLine2?: string;
	city: string;
	state: string;
	country: string;
	zipCode: string;
	phoneNumber: string;
	deliveryInstructions?: string;
	isDefault: boolean;
}

interface ShippingAddressFormData {
	id?: string;
	name: string;
	addressLine1: string;
	addressLine2?: string;
	city: string;
	state: string;
	country: string;
	zipCode: string;
	phoneNumber: string;
	deliveryInstructions?: string;
	isDefault: boolean;
}

export default function ShippingAddressPage() {
	const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [showForm, setShowForm] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState<ShippingAddressFormData>({
		name: "",
		addressLine1: "",
		addressLine2: "",
		city: "",
		state: "",
		country: "United States",
		zipCode: "",
		phoneNumber: "",
		deliveryInstructions: "",
		isDefault: false,
	});
	const [instruction, setInstruction] = useState("");
	const [charCount, setCharCount] = useState(0);

	const api = useAuthApi();

	// Fetch shipping addresses
	useEffect(() => {
		const fetchAddresses = async () => {
			setLoading(true);
			const { data, error } = await api.get<ShippingAddress[]>(
				"/api/shipping-addresses"
			);

			if (error) {
				setError(
					"Failed to load shipping addresses. Please ensure you are logged in."
				);
			} else if (data) {
				setAddresses(data);
			}
			setLoading(false);
		};

		fetchAddresses();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleAddNew = () => {
		// Reset form data
		setFormData({
			name: "",
			addressLine1: "",
			addressLine2: "",
			city: "",
			state: "",
			country: "United States",
			zipCode: "",
			phoneNumber: "",
			deliveryInstructions: "",
			isDefault: false,
		});
		setIsEditing(false);
		setShowForm(true);
	};

	const handleEdit = (address: ShippingAddress) => {
		setFormData({
			id: address.id,
			name: address.name,
			addressLine1: address.addressLine1,
			addressLine2: address.addressLine2 || "",
			city: address.city,
			state: address.state,
			country: address.country,
			zipCode: address.zipCode,
			phoneNumber: address.phoneNumber,
			deliveryInstructions: address.deliveryInstructions || "",
			isDefault: address.isDefault,
		});
		setIsEditing(true);
		setShowForm(true);
	};

	const handleCancel = () => {
		setShowForm(false);
		setError(null);
	};

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value, type } = e.target;
		const checked =
			type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

		setFormData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	// Handle reason text change and update character count
	const handleDeliveryInstructionCount = (
		e: React.ChangeEvent<HTMLTextAreaElement>
	) => {
		const text = e.target.value;
		// Limit to 500 characters
		if (text.length <= 500) {
			setInstruction(text);
			setCharCount(text.length);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			if (isEditing && formData.id) {
				// Update existing address
				const { error } = await api.put<{ success: boolean }>(
					`/api/shipping-addresses/${formData.id}`,
					formData as unknown as Record<string, unknown>
				);

				if (error) {
					throw new Error(error || "Failed to update shipping address");
				}

				// Update the addresses list
				setAddresses((prev) =>
					prev.map((address) =>
						address.id === formData.id
							? { ...address, ...formData, id: formData.id }
							: formData.isDefault
								? { ...address, isDefault: false }
								: address
					)
				);
			} else {
				// Add new address
				const { data, error } = await api.post<ShippingAddress>(
					"/api/shipping-addresses",
					formData as unknown as Record<string, unknown>
				);

				if (error) {
					throw new Error(error || "Failed to add shipping address");
				}

				if (data) {
					// If the new address is default, update all other addresses
					if (formData.isDefault) {
						setAddresses((prev) => [
							...prev.map((address) => ({ ...address, isDefault: false })),
							data,
						]);
					} else {
						setAddresses((prev) => [...prev, data]);
					}
				}
			}

			// Hide the form after successful submission
			setShowForm(false);
		} catch (err) {
			console.error("Error saving address:", err);
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	const handleMakeDefault = async (id: string) => {
		const { error } = await api.put<{ success: boolean }>(
			`/api/shipping-addresses/${id}/default`,
			{}
		);

		if (error) {
			setError("Failed to update default address");
		} else {
			// Update the local state to reflect the change
			setAddresses(
				addresses.map((address) => ({
					...address,
					isDefault: address.id === id,
				}))
			);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Are you sure you want to delete this address?")) {
			return;
		}

		const { error } = await api.delete<{ success: boolean }>(
			`/api/shipping-addresses/${id}`
		);

		if (error) {
			setError("Failed to delete address");
		} else {
			// Remove the deleted address from the state
			setAddresses(addresses.filter((address) => address.id !== id));
		}
	};

	if (api.loading && !addresses.length) {
		return (
			<div className="flex flex-col justify-center items-center h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<p className="mt-2">Loading shipping addresses...</p>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
			<div className="mb-6">
				<h1 className="text-2xl font-semibold mb-1">Shipping Settings</h1>
				<p className="text-gray-600">
					Manage your shipping addresses and preferences for receiving products
					from brands
				</p>
				<hr className="my-4" />
			</div>
			{showForm ? (
				// Form view
				<>
					<button
						onClick={handleCancel}
						className="flex items-center text-gray-600 mb-6"
					>
						<ChevronLeft size={20} />
						<span>Back to Shipping Addresses</span>
					</button>

					<div className="mb-6">
						<h1 className="text-xl font-semibold mb-1">
							{isEditing ? "Edit Shipping Address" : "Add New Shipping Address"}
						</h1>
						<p className="text-gray-600">
							{isEditing
								? "Update your shipping address information"
								: "Add a new address where brands can send products for your UGC content"}
						</p>
						<hr className="my-4" />
					</div>

					{error && (
						<div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
							<div className="flex">
								<div className="flex-shrink-0">
									<svg
										className="h-5 w-5 text-red-500"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
								<div className="ml-3">
									<p className="text-sm text-red-700">{error}</p>
								</div>
							</div>
						</div>
					)}

					<form onSubmit={handleSubmit}>
						<div className="space-y-6">
							<div>
								<label
									htmlFor="name"
									className="block text-sm font-medium text-gray-700"
								>
									Reciepent Full Name
								</label>
								<Input
									type="text"
									id="name"
									name="name"
									value={formData.name}
									onChange={handleChange}
									required
									className="mt-1 block w-full rounded-md shadow-sm "
									placeholder="Full name of recipient"
								/>
							</div>

							<div>
								<label
									htmlFor="addressLine1"
									className="block text-sm font-medium text-gray-700"
								>
									Street Address
								</label>
								<Input
									type="text"
									id="addressLine1"
									name="addressLine1"
									value={formData.addressLine1}
									onChange={handleChange}
									required
									className="mt-1 block w-full rounded-md shadow-sm "
									placeholder="Street address, company name, etc."
								/>
							</div>

							<div>
								<label
									htmlFor="addressLine2"
									className="block text-sm font-medium text-gray-700"
								>
									Apartment, Suite, Unit, etc. (Optional)
								</label>
								<Input
									type="text"
									id="addressLine2"
									name="addressLine2"
									value={formData.addressLine2}
									onChange={handleChange}
									className="mt-1 block w-full rounded-md shadow-sm"
									placeholder="Apartment, suite, unit, building, floor, etc."
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label
										htmlFor="city"
										className="block text-sm font-medium text-gray-700"
									>
										City
									</label>
									<Input
										type="text"
										id="city"
										name="city"
										value={formData.city}
										onChange={handleChange}
										required
										className="mt-1 block w-full rounded-md shadow-sm "
									/>
								</div>

								<div>
									<label
										htmlFor="state"
										className="block text-sm font-medium text-gray-700"
									>
										State / Province
									</label>
									<Input
										type="text"
										id="state"
										name="state"
										value={formData.state}
										onChange={handleChange}
										required
										className="mt-1 block w-full rounded-md shadow-sm"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label
										htmlFor="country"
										className="block text-sm font-medium text-gray-700 mb-1"
									>
										Country
									</label>
									<Select
										value={formData.country}
										onValueChange={(value) =>
											setFormData((prev) => ({ ...prev, country: value }))
										}
										required
									>
										<SelectTrigger id="country-select">
											<SelectValue placeholder="Select your country" />
										</SelectTrigger>
										<SelectContent className="bg-[#f7f7f7]">
											{countries.map((country) => (
												<SelectItem key={country.code} value={country.name}>
													{country.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div>
									<label
										htmlFor="zipCode"
										className="block text-sm font-medium text-gray-700"
									>
										ZIP / Postal Code
									</label>
									<Input
										type="text"
										id="zipCode"
										name="zipCode"
										value={formData.zipCode}
										onChange={handleChange}
										required
										className="mt-1 block w-full rounded-md shadow-sm"
									/>
								</div>
							</div>

							<div>
								<label
									htmlFor="phoneNumber"
									className="block text-sm font-medium text-gray-700"
								>
									Phone Number
								</label>
								<Input
									type="tel"
									id="phoneNumber"
									name="phoneNumber"
									value={formData.phoneNumber}
									onChange={handleChange}
									required
									className="mt-1 block w-full rounded-mdshadow-sm"
									placeholder="For delivery questions"
								/>
							</div>

							<div>
								<label
									htmlFor="deliveryInstructions"
									className="block text-sm font-medium text-gray-700"
								>
									Delivery Instructions (Optional)
								</label>
								<Textarea
									id="deliveryInstructions"
									name="deliveryInstructions"
									value={instruction}
									onChange={handleDeliveryInstructionCount}
									rows={3}
									className="mt-1 block w-full rounded-md shadow-sm"
									placeholder="Special instructions for delivery"
								/>
								<div className="flex justify-start">
									<p
										className={`text-sm ${charCount > 450 ? (charCount > 480 ? "text-red-500" : "text-orange-500") : "text-gray-500"}`}
									>
										{charCount}/500
									</p>
								</div>
							</div>

							<div className="bg-[#FDEFE7] p-3 text-[#BE4501] mt-6 rounded-lg">
								<div className="flex">
									<div className="flex-shrink-0 mr-1.5 mt-1">
										<svg
											className="h-4 w-4"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fillRule="evenodd"
												d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
									<p className="text-sm">
										Your shipping address is only shared with brands that
										you&apos;re actively creating content for. Brands will use
										this address to send you products for UGC creation.
									</p>
								</div>
							</div>

							<div className="flex items-center">
								<input
									type="checkbox"
									id="isDefault"
									name="isDefault"
									checked={formData.isDefault}
									onChange={handleChange}
									className="h-4 w-4 text-orange-600  border-gray-300 rounded accent-orange-600"
								/>
								<label
									htmlFor="isDefault"
									className="ml-2 block text-sm text-gray-700"
								>
									Set as default address
								</label>
							</div>
						</div>

						<div className="mt-8 flex justify-end space-x-4">
							<button
								type="button"
								onClick={handleCancel}
								className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none "
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={loading}
								className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md shadow-sm text-sm focus:outline-none "
							>
								{loading
									? "Saving..."
									: isEditing
										? "Update Address"
										: "Add New Address"}
							</button>
						</div>
					</form>
				</>
			) : (
				// List view
				<>
					{error && (
						<div className="p-4 mb-4 text-red-500 bg-red-50 rounded-md">
							{error}
						</div>
					)}

					<div className="mb-6">
						<h2 className="text-lg font-semibold mb-1">
							Your Shipping Addresses
						</h2>
						<p className="text-gray-600 mb-4">
							Add addresses where brands can send products for your UGC content
						</p>

						<button
							onClick={handleAddNew}
							className="bg-black text-white text-sm px-4 py-1 rounded-md flex items-center mb-6"
						>
							Add New Shipping Address
							<span className="ml-2 text-xl">+</span>
						</button>

						{addresses.length === 0 ? (
							<div className="p-6 bg-gray-50 rounded-lg text-center">
								No shipping addresses found. Add your first address to receive
								products.
							</div>
						) : (
							addresses.map((address) => (
								<div key={address.id} className="mb-4 p-6 border rounded-lg">
									<div className="flex justify-between items-start">
										<div className="flex items-center">
											<h3 className="text-lg font-medium mr-2">
												{address.name}
											</h3>
											{address.isDefault && (
												<span className="bg-[#F1FEFB] text-[#20D5EC] px-2 py-1 text-xs rounded-full">
													Default
												</span>
											)}
										</div>
										<div className="flex space-x-2">
											<button
												onClick={() => handleEdit(address)}
												className="text-gray-600 hover:text-gray-900"
											>
												<Edit size={20} />
											</button>
											<button
												onClick={() => handleDelete(address.id)}
												className="text-gray-600 hover:text-red-600"
											>
												<Trash2 size={20} />
											</button>
										</div>
									</div>

									<div className="font-extralight mt-2 text-[#667085] space-y-1">
										<p>{address.addressLine1}</p>
										{address.addressLine2 && <p>{address.addressLine2}</p>}
										<p>
											{address.city}, {address.state} {address.zipCode}
										</p>
										<p>{address.country}</p>
										<p>{address.phoneNumber}</p>
										{address.deliveryInstructions && (
											<p className="mt-2 italic">
												Delivery instructions: {address.deliveryInstructions}
											</p>
										)}
									</div>

									{!address.isDefault && (
										<div className="mt-4">
											<button
												onClick={() => handleMakeDefault(address.id)}
												className="text-gray-600 border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
											>
												Make Default
											</button>
										</div>
									)}
								</div>
							))
						)}
					</div>

					<div className="bg-[#FDEFE7] p-3 text-[#BE4501] mt-6 rounded-lg">
						<div className="flex">
							<div className="flex-shrink-0 mr-1.5 mt-1">
								<svg
									className="h-4 w-4"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<p className="text-sm">
								Your shipping address is only shared with brands that
								you&apos;re actively creating content for. Brands will use this
								address to send you products for UGC creation.
							</p>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

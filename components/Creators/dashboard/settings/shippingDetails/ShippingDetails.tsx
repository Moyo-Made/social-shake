import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Edit } from "lucide-react";
import { useAuthApi } from "@/hooks/useAuthApi";

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

export default function ShippingAddressPage() {
	const router = useRouter();
	const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
	const [error, setError] = useState<string | null>(null);
	const api = useAuthApi(); 

	// Fetch shipping addresses
	useEffect(() => {
		const fetchAddresses = async () => {
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
		};

		fetchAddresses();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleAddNew = () => {
		router.push("/creator/dashboard/settings/shipping/add");
	};

	const handleEdit = (id: string) => {
		router.push(`/creator/dashboard/settings/shipping/edit/${id}`);
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

	if (api.loading) {
		return (
			<div className="flex flex-col justify-center items-center h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				Loading shipping addresses...
			</div>
		);
	}

	if (error) {
		return <div className="p-8 text-red-500">{error}</div>;
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

			<div className="mb-6">
				<h2 className="text-lg font-semibold mb-1">Your Shipping Addresses</h2>
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
									<h3 className="text-lg font-medium mr-2">{address.name}</h3>
									{address.isDefault && (
										<span className="bg-[#F1FEFB] text-[#20D5EC] px-2 py-1 text-xs rounded-full">
											Default
										</span>
									)}
								</div>
								<div className="flex space-x-2">
                
									<button
										onClick={() => handleEdit(address.id)}
										className=" text-gray-600 hover:text-gray-900"
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

			<div className="bg-[#FDEFE7]  p-3 text-[#BE4501] mt-6 rounded-lg">
				<div className="flex ">
					<div className="flex-shrink-0 mr-1.5 mt-1">
						<svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
							<path
								fillRule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
								clipRule="evenodd"
							/>
						</svg>
					</div>
					<p className="text-sm">
						Your shipping address is only shared with brands that you&apos;re
						actively creating content for. Brands will use this address to send
						you products for UGC creation.
					</p>
				</div>
			</div>

			<div className="mt-6 flex justify-end">
				<button className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-md">
					Save Changes
				</button>
			</div>
		</div>
	);
}

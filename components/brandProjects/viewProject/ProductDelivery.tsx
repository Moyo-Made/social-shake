import React, { useState } from "react";
import { ChevronDown, Mail } from "lucide-react";
import Image from "next/image";

// interface ProductDeliveryProps {
//   projectFormData: ProjectFormData;
// }

const ProductDelivery = () => {
	// Mock data based on the image
	const deliveryData = [
		{
			id: 1,
			name: "Colina Michelle",
			email: "colina@test.com",
			status: "Pending Shipment",
			updatedOn: "March 5, 2025",
			hasIssue: false,
		},
		{
			id: 2,
			name: "Melinda Roshovelle",
			email: "melinda@test.com",
			status: "Shipped",
			updatedOn: "March 5, 2025",
			hasIssue: false,
		},
		{
			id: 3,
			name: "Olumise Web",
			email: "olumise@test.com",
			status: "Delivered",
			updatedOn: "March 5, 2025",
			hasIssue: false,
		},
		{
			id: 4,
			name: "Bumia Nocolee",
			email: "bumia@test.com",
			status: "Shipped",
			updatedOn: "March 5, 2025",
			hasIssue: true,
		},
	];

	// State to maintain description for the last user with issue
	const [issueDescription, setIssueDescription] = useState("");

	const getStatusColor = (status: string) => {
		switch (status) {
			case "Pending Shipment":
				return "bg-yellow-100 text-yellow-800";
			case "Shipped":
				return "bg-pink-100 text-pink-800";
			case "Delivered":
				return "bg-green-100 text-green-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "Pending Shipment":
				return "•";
			case "Shipped":
				return "•";
			case "Delivered":
				return "✓";
			default:
				return "";
		}
	};

	return (
		<div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-6 space-y-4 border border-gray-200">
			{deliveryData.map((user) => (
				<div
					key={user.id}
					className="border border-gray-200 rounded-lg p-4 mb-4"
				>
					<div className="flex items-start mb-4">
						<div className="flex-shrink-0 mr-4">
							<div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
								<Image
									src="/icons/"
									alt={user.name}
									width={20}
									height={20}
									className="w-full h-full object-cover"
								/>
							</div>
						</div>
						<div className="flex-grow">
							<div className="flex justify-between">
								<div>
									<h3 className="text-lg font-medium text-gray-900">
										{user.name}
									</h3>
									<p className="text-sm text-gray-600">Email: {user.email}</p>
									<div className="inline-flex items-center mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded-full">
										<span className="mr-1">Message Creator</span>
										<span className="transform rotate-45">⌘</span>
									</div>
								</div>
								<div className="text-right">
									{user.status && (
										<span
											className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}
										>
											<span className="mr-1">{getStatusIcon(user.status)}</span>
											{user.status}
										</span>
									)}
									<p className="text-sm text-gray-600 mt-1">
										Updated On: {user.updatedOn}
									</p>
								</div>
							</div>
						</div>
					</div>

					<div className="space-y-4">
						<div>
							<label className="text-sm font-medium text-gray-700">
								Delivery Status
							</label>
							<div className="mt-1 relative">
								<select
									className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md appearance-none bg-white"
									defaultValue={
										user.status === "Pending Shipment" ? "" : user.status
									}
								>
									{user.hasIssue ? (
										<option>Report an Issue</option>
									) : (
										<>
											{user.status === "Pending Shipment" && (
												<option value="">Select Status</option>
											)}
											{user.status === "Shipped" && (
												<option value="Shipped">Shipped</option>
											)}
											{user.status === "Delivered" && (
												<option value="Delivered">Delivered</option>
											)}
										</>
									)}
								</select>
								<div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
									<ChevronDown className="h-4 w-4 text-gray-400" />
								</div>
							</div>
						</div>

						{user.id === 2 && (
							<div>
								<label className="text-sm font-medium text-gray-700">
									Tracking Number
								</label>
								<div className="mt-1">
									<input
										type="text"
										placeholder="Enter Tracking Number"
										className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
									/>
								</div>
							</div>
						)}

						{user.hasIssue && (
							<div>
								<label className="text-sm font-medium text-gray-700">
									Issue Faced
								</label>
								<div className="mt-1">
									<textarea
										rows={4}
										placeholder="Describe the Issue in detail"
										className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
										value={issueDescription}
										onChange={(e) => setIssueDescription(e.target.value)}
									/>
								</div>
							</div>
						)}

						<button className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
							<span>Notify Creator</span>
							<Mail className="ml-2 h-4 w-4" />
						</button>
					</div>
				</div>
			))}
		</div>
	);
};

export default ProductDelivery;

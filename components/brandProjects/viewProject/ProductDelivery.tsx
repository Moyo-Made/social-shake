import React, { useState } from "react";
import { Mail, Check } from "lucide-react";
import Image from "next/image";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

// Define types for our data
interface DeliveryUser {
	id: number;
	name: string;
	creatorIcon: string;
	email: string;
	status: DeliveryStatus;
	updatedOn: string;
	hasIssue: boolean;
	trackingNumber: string;
}

// Create a union type for status values
type DeliveryStatus =
	| "Pending Shipment"
	| "Shipped"
	| "Delivered"
	| "Issue Reported";

// Define type for issue descriptions state
interface IssueDescriptionsState {
	[userId: number]: string;
}

const ProductDelivery: React.FC = () => {
	// Mock data based on the image
	const initialDeliveryData: DeliveryUser[] = [
		{
			id: 1,
			name: "Colina Michelle",
			creatorIcon: "/icons/creator-icon.svg",
			email: "colina@test.com",
			status: "Pending Shipment",
			updatedOn: "March 5, 2025",
			hasIssue: false,
			trackingNumber: "",
		},
		{
			id: 2,
			name: "Melinda Roshovelle",
			creatorIcon: "/icons/creator-icon.svg",
			email: "melinda@test.com",
			status: "Shipped",
			updatedOn: "March 5, 2025",
			hasIssue: false,
			trackingNumber: "TRK12345678",
		},
		{
			id: 3,
			name: "Olumise Web",
			creatorIcon: "/icons/creator-icon.svg",
			email: "olumise@test.com",
			status: "Delivered",
			updatedOn: "March 5, 2025",
			hasIssue: false,
			trackingNumber: "TRK87654321",
		},
		{
			id: 4,
			name: "Bumia Nocolee",
			creatorIcon: "/icons/creator-icon.svg",
			email: "bumia@test.com",
			status: "Shipped",
			updatedOn: "March 5, 2025",
			hasIssue: true,
			trackingNumber: "TRK11223344",
		},
	];

	const [deliveryData, setDeliveryData] =
		useState<DeliveryUser[]>(initialDeliveryData);
	const [issueDescriptions, setIssueDescriptions] =
		useState<IssueDescriptionsState>({});

	const handleStatusChange = (userId: number, newStatus: DeliveryStatus) => {
		setDeliveryData((prevData) =>
			prevData.map((user) => {
				if (user.id === userId) {
					// Update the updated date when status changes
					return {
						...user,
						status: newStatus,
						updatedOn: new Date().toLocaleDateString("en-US", {
							month: "long",
							day: "numeric",
							year: "numeric",
						}),
					};
				}
				return user;
			})
		);
	};

	const handleTrackingNumberChange = (
		userId: number,
		trackingNumber: string
	) => {
		setDeliveryData((prevData) =>
			prevData.map((user) => {
				if (user.id === userId) {
					return { ...user, trackingNumber };
				}
				return user;
			})
		);
	};

	const handleIssueDescriptionChange = (
		userId: number,
		description: string
	) => {
		setIssueDescriptions((prev) => ({
			...prev,
			[userId]: description,
		}));
	};

	// Status badge styling function
	const getStatusBadge = (status: DeliveryStatus) => {
		let badgeClass =
			"inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ";

		switch (status) {
			case "Pending Shipment":
				badgeClass += "bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A]";
				return (
					<div className={badgeClass}>
						<span className="mr-1 mb-0.5">•</span>
						{status}
					</div>
				);
			case "Shipped":
				badgeClass += "bg-[#FFE5FB] border border-[#FC52E4] text-[#FC52E4]";
				return (
					<div className={badgeClass}>
						<span className="mr-1 mb-0.5">•</span>
						{status}
					</div>
				);
			case "Delivered":
				badgeClass += "bg-[#ECFDF3] border border-[#ABEFC6] text-[#067647";
				return (
					<div className={badgeClass}>
						<Check className="w-3 h-3 mr-1" />
						{status}
					</div>
				);
			case "Issue Reported":
				badgeClass += "bg-red-100 text-red-800";
				return <div className={badgeClass}>{status}</div>;
			default:
				badgeClass += "bg-gray-100 text-gray-800";
				return <div className={badgeClass}>{status}</div>;
		}
	};

	return (
		<div className="w-full max-w-4xl mx-auto rounded-lg shadow-sm space-y-4">
			{deliveryData.map((user) => (
				<Card key={user.id} className="mb-4">
					<CardContent className="p-4">
						<div className="flex items-start mb-4">
							<div className="flex-shrink-0 mr-4">
								<div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
									<Image
										src={user.creatorIcon}
										alt={user.name}
										width={64}
										height={64}
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
										<div className="inline-flex items-center mt-1 px-2 py-1 bg-black text-white text-xs rounded-full">
											<span className="mr-1">Message Creator</span>
											<Image
												src="/icons/messageIcon.svg"
												alt="Message Icon"
												width={10}
												height={10}
											/>
										</div>
									</div>
									<div className="text-right">
										{getStatusBadge(user.status)}
										<p className="text-sm text-gray-600 mt-1">
											Updated On: {user.updatedOn}
										</p>
									</div>
								</div>
							</div>
						</div>

						<div className="space-y-4 mt-4">
							<div>
								<label className="text-sm font-medium text-gray-700 block mb-1">
									Delivery Status
								</label>
								<Select
									defaultValue={user.status}
									onValueChange={(value: string) =>
										handleStatusChange(user.id, value as DeliveryStatus)
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent className="bg-[#f7f7f7]">
										<SelectItem value="Pending Shipment">
											Pending Shipment
										</SelectItem>
										<SelectItem value="Shipped">Shipped</SelectItem>
										<SelectItem value="Delivered">Delivered</SelectItem>
										<SelectItem value="Issue Reported">
											Report an Issue
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{user.status === "Shipped" && (
								<div>
									<label className="text-sm font-medium text-gray-700 block mb-1">
										Tracking Number
									</label>
									<Input
										type="text"
										placeholder="Enter Tracking Number"
										value={user.trackingNumber}
										onChange={(e) =>
											handleTrackingNumberChange(user.id, e.target.value)
										}
									/>
								</div>
							)}

							{user.status === "Issue Reported" && (
								<div>
									<label className="text-sm font-medium text-gray-700 block mb-1">
										Issue Description
									</label>
									<Textarea
										rows={4}
										placeholder="Describe the Issue in detail"
										value={issueDescriptions[user.id] || ""}
										onChange={(e) =>
											handleIssueDescriptionChange(user.id, e.target.value)
										}
									/>
								</div>
							)}
						</div>
					</CardContent>
					<CardFooter className="px-4 pb-4 pt-0">
						<Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
							<span>Notify Creator</span>
							<Mail className="ml-2 h-4 w-4" />
						</Button>
					</CardFooter>
				</Card>
			))}
		</div>
	);
};

export default ProductDelivery;

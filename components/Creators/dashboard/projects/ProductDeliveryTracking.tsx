import { useState, useEffect } from "react";
import { Check, Copy  } from "lucide-react";
import Image from "next/image";

// Mock function to simulate Firebase function calls
// In a real implementation, you would use firebase.functions().httpsCallable()
const mockFirebaseFunctions = {
	getDeliveryStatus: async () => {
		// This would be replaced with actual Firebase function call
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve({
					data: {
						exists: true,
						data: {
							productName: "Sensational Cream",
							productQuantity: 1,
							productType: "Product Sample",
							currentStatus: "out_for_delivery",
							shippingAddress: {
								name: "Catherine Johnson",
								street: "123 Creator Ave",
								city: "Los Angeles",
								state: "CA",
								zipCode: "90210",
								phone: "(555) 123-4567",
							},
							estimatedDeliveryDate: {
								from: { seconds: 1741765200 }, // Mar 10, 2025
								to: { seconds: 1741938000 }, // Mar 12, 2025
							},
							contentDueDate: { seconds: 1743234000 }, // Mar 25, 2025
							shippedDate: { seconds: 1740988800 }, // Feb 28, 2025
							receiptConfirmed: false,
							contentCreationStarted: false,
							trackingNumber: "1Z999AA1012345678",
							carrier: "UPS",
							statusHistory: [
								{
									status: "preparation",
									timestamp: { seconds: 1740988800 }, // Feb 28, 2025
									description: "The Brand is preparing your product package",
								},
								{
									status: "shipped",
									timestamp: { seconds: 1740988800 }, // Feb 28, 2025
									description:
										'The Product "Sensational Cream" has been shipped via UPS',
								},
								{
									status: "in_region",
									timestamp: { seconds: 1740988800 }, // Feb 28, 2025
									description:
										'The Product "Sensational Cream" has arrived in Los Angeles distribution center',
								},
								{
									status: "out_for_delivery",
									timestamp: { seconds: 1740988800 }, // Feb 28, 2025
									description:
										"Your package is on a delivery vehicle and will be delivered today",
								},
							],
						},
					},
				});
			}, 500);
		});
	},
	confirmProductReceipt: async () => {
		// This would be replaced with actual Firebase function call
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve({
					data: {
						success: true,
						message: "Receipt confirmed",
						contentCreationStartDate: { seconds: 1741248000 }, // Mar 3, 2025
					},
				});
			}, 500);
		});
	},
	beginContentCreation: async () => {
		// This would be replaced with actual Firebase function call
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve({
					data: {
						success: true,
						message: "Content creation period has begun",
						contentDueDate: { seconds: 1743234000 }, // Mar 25, 2025
					},
				});
			}, 500);
		});
	},
};

// Helper function to format dates
const formatDate = (timestamp: { seconds: number }) => {
	if (!timestamp) return "Not Yet Shipped";

	const date = new Date(timestamp.seconds * 1000);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

// Helper function to format date range
const formatDateRange = (
	from: { seconds: number },
	to: { seconds: number }
) => {
	if (!from || !to) return "Not Yet Shipped";

	const fromDate = new Date(from.seconds * 1000);
	const toDate = new Date(to.seconds * 1000);

	const fromFormatted = fromDate.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
	const toFormatted = toDate.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});

	return `${fromFormatted}-${toFormatted.split(", ")[0]}, ${toFormatted.split(", ")[1]}`;
};

export default function DeliveryTracking() {
	interface DeliveryData {
		receiptConfirmed?: boolean;
		currentStatus: string;
		actualDeliveryDate?: { seconds: number };
		statusHistory: {
			status: string;
			timestamp: { seconds: number };
			description: string;
		}[];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		[key: string]: any;
	}

	const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
	const [loading, setLoading] = useState(true);
	const [confirmModalOpen, setConfirmModalOpen] = useState(false);
	const [currentView, setCurrentView] = useState("pending"); // 'pending', 'inTransit', 'delivered'

	const projectId = "project123"; // In a real app, this would come from props or context

	useEffect(() => {
		const fetchDeliveryStatus = async () => {
			try {
				const result = (await mockFirebaseFunctions.getDeliveryStatus()) as {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					data: { exists: boolean; data: any };
				};
				if (result.data.exists) {
					setDeliveryData(result.data.data);

					// Set the correct view based on status
					if (
						result.data.data.currentStatus === "delivered" ||
						result.data.data.currentStatus === "content_creation"
					) {
						setCurrentView("delivered");
					} else if (
						result.data.data.currentStatus === "shipped" ||
						result.data.data.currentStatus === "in_region" ||
						result.data.data.currentStatus === "out_for_delivery"
					) {
						setCurrentView("inTransit");
					} else {
						setCurrentView("pending");
					}
				}
			} catch (error) {
				console.error("Error fetching delivery status:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchDeliveryStatus();
	}, [projectId]);

	const handleConfirmReceipt = async () => {
		setConfirmModalOpen(false);
		setLoading(true);

		try {
			const result = await mockFirebaseFunctions.confirmProductReceipt();
			if ((result as { data: { success: boolean } }).data.success) {
				// Update delivery data with confirmed receipt
				setDeliveryData((prev) => ({
					...(typeof prev === "object" && prev !== null ? prev : {}),
					receiptConfirmed: true,
					currentStatus: "delivered",
					actualDeliveryDate: { seconds: Date.now() / 1000 },
					statusHistory: [
						...(prev?.statusHistory || []),
						{
							status: "delivered",
							timestamp: { seconds: Date.now() / 1000 },
							description: "Package delivered and receipt confirmed",
						},
					],
				}));
				setCurrentView("delivered");
			}
		} catch (error) {
			console.error("Error confirming receipt:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleBeginContentCreation = async () => {
		setLoading(true);

		try {
			const result = await mockFirebaseFunctions.beginContentCreation();
			if ((result as { data: { success: boolean } }).data.success) {
				// Update delivery data with content creation started
				setDeliveryData((prev) => ({
					...(prev || {}),
					contentCreationStarted: true,
					currentStatus: "content_creation",
					statusHistory: [
						...(prev?.statusHistory || []),
						{
							status: "content_creation",
							timestamp: { seconds: Date.now() / 1000 },
							description: "Content creation period has begun",
						},
					],
				}));
			}
		} catch (error) {
			console.error("Error beginning content creation:", error);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				Loading delivery information...
			</div>
		);
	}

	if (!deliveryData) {
		return (
			<div className="flex justify-center items-center h-64">
				No delivery information found
			</div>
		);
	}

	// Determine which steps are completed
	const stepsCompleted = {
		preparation: [
			"preparation",
			"shipped",
			"in_region",
			"out_for_delivery",
			"delivered",
			"content_creation",
		].includes(deliveryData.currentStatus),
		shipped: [
			"shipped",
			"in_region",
			"out_for_delivery",
			"delivered",
			"content_creation",
		].includes(deliveryData.currentStatus),
		inRegion: [
			"in_region",
			"out_for_delivery",
			"delivered",
			"content_creation",
		].includes(deliveryData.currentStatus),
		outForDelivery: [
			"out_for_delivery",
			"delivered",
			"content_creation",
		].includes(deliveryData.currentStatus),
		delivered: ["delivered", "content_creation"].includes(
			deliveryData.currentStatus
		),
		contentCreation:
			["content_creation"].includes(deliveryData.currentStatus) ||
			deliveryData.contentCreationStarted === true,
	};

	// Find the status descriptions from history
	const findStatusDescription = (status: string) => {
		const historyItem = deliveryData.statusHistory.find(
			(item: { status: string }) => item.status === status
		);
		return historyItem ? historyItem.description : "";
	};

	// Function to get status date
	const getStatusDate = (status: string) => {
		const historyItem = deliveryData.statusHistory.find(
			(item: { status: string }) => item.status === status
		);
		return historyItem ? formatDate(historyItem.timestamp) : "";
	};

	return (
		<div className="flex flex-col md:flex-row w-full gap-6">
			{/* Timeline section */}
			<div className="flex-1">
				{/* Step 1: Preparation */}
				<div className="flex">
					<div className="mr-4">
						<div
							className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.preparation ? "bg-orange-500 border-4 border-[#FFBF9B]" : "bg-gray-300 border-4 border-gray-200"}`}
						>
							<Check className="text-white" size={24} />
						</div>
					</div>
					<div className="flex-1">
						<h3 className="text-lg font-medium text-black">
							Product yet to be Shipped{" "}
							{getStatusDate("preparation") && (
								<span className="text-sm ml-2 font-normal text-gray-500">
									{getStatusDate("preparation")}
								</span>
							)}
						</h3>
						<p className="text-base text-gray-600">
							{findStatusDescription("preparation") ||
								"The Brand is preparing your product package"}
						</p>
					</div>
				</div>

				{/* Dotted line */}
				<div className="flex">
					<div className="ml-6 flex justify-center">
						<div
							className="w-0.5 h-16"
							style={{
								backgroundImage:
									"linear-gradient(to bottom, #fdba74 50%, transparent 50%)",
								backgroundSize: "1px 8px",
							}}
						></div>
					</div>
				</div>

				{/* Step 2: Shipped */}
				<div className="flex">
					<div className="mr-4">
						<div
							className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.shipped ? "bg-orange-500 border-4 border-[#FFBF9B]" : "bg-gray-300 border-4 border-gray-200"}`}
						>
							<Check className="text-white" size={24} />
						</div>
					</div>
					<div className="flex-1">
						<h3 className="text-lg text-black font-medium">
							Sensational Cream Product Shipped
							{stepsCompleted.shipped ? (
								<span className="text-sm font-normal text-gray-500 ml-2">
									{getStatusDate("shipped")}
								</span>
							) : (
								<span className="text-sm font-normal text-gray-500 ml-2">
									Pending
								</span>
							)}
						</h3>
						<p className="text-gray-600">
							{findStatusDescription("shipped") ||
								'The Product "Sensational Cream" is yet to be shipped'}
						</p>
						{deliveryData.trackingNumber && stepsCompleted.shipped && (
							<p className="text-orange-500 mt-1 text-sm flex items-center underline">
								Track package with UPS:{" "}
								<span>{String(deliveryData.trackingNumber)}</span>
								<Copy size={16} className="ml-2" />
							</p>
						)}
					</div>
				</div>

				{/* Dotted line */}
				<div className="flex">
					<div className="ml-6 flex justify-center">
						<div
							className="w-0.5 h-16"
							style={{
								backgroundImage:
									"linear-gradient(to bottom, #fdba74 50%, transparent 50%)",
								backgroundSize: "1px 8px",
							}}
						></div>
					</div>
				</div>
				{/* Step 3: In Region */}
				<div className="flex">
					<div className="mr-4">
						<div
							className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.inRegion ? "bg-orange-500 border-4 border-[#FFBF9B]" : "bg-gray-300 border-4 border-gray-200"}`}
						>
							<Check className="text-white" size={24} />
						</div>
					</div>
					<div className="flex-1">
						<h3 className="text-lg text-black font-medium">
							Product has reached your Region
							{stepsCompleted.inRegion ? (
								<span className="text-sm font-normal text-gray-500 ml-2">
									{getStatusDate("in_region")}
								</span>
							) : (
								<span className="text-sm font-normal text-gray-500 ml-2">
									Pending
								</span>
							)}
						</h3>
						<p className="text-gray-600">
							{findStatusDescription("in_region") ||
								'The Product "Sensational Cream" has not arrived in your Region'}
						</p>
					</div>
				</div>

				{/* Dotted line */}
				<div className="flex">
					<div className="ml-6 flex justify-center">
						<div
							className="w-0.5 h-16"
							style={{
								backgroundImage:
									"linear-gradient(to bottom, #fdba74 50%, transparent 50%)",
								backgroundSize: "1px 8px",
							}}
						></div>
					</div>
				</div>

				{/* Step 4: Out for Delivery */}
				<div className="flex">
					<div className="mr-4">
						<div
							className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.outForDelivery ? "bg-orange-500 border-4 border-[#FFBF9B]" : "bg-gray-300 border-4 border-gray-200"}`}
						>
							<Check className="text-white" size={24} />
						</div>
					</div>
					<div className="flex-1">
						<h3 className="text-lg text-black font-medium">
							Product Out for Delivery
							{stepsCompleted.outForDelivery ? (
								<span className="text-sm font-normal text-gray-500 ml-2">
									{getStatusDate("out_for_delivery")}
								</span>
							) : (
								<span className="text-sm font-normal text-gray-500 ml-2">
									Pending
								</span>
							)}
						</h3>
						<p className="text-gray-600">
							{findStatusDescription("out_for_delivery") ||
								"Your Package was yet to be delivered"}
						</p>
					</div>
				</div>

				{/* Dotted line */}
				<div className="flex">
					<div className="ml-6 flex justify-center">
						<div
							className="w-0.5 h-16"
							style={{
								backgroundImage:
									"linear-gradient(to bottom, #fdba74 50%, transparent 50%)",
								backgroundSize: "1px 8px",
							}}
						></div>
					</div>
				</div>

				{/* Step 5: Delivered */}
				<div className="flex">
					<div className="mr-4">
						<div
							className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.delivered ? "bg-orange-500 border-4 border-[#FFBF9B]" : "bg-gray-300 border-4 border-gray-200"}`}
						>
							<Check className="text-white" size={24} />
						</div>
					</div>
					<div className="flex-1">
						<h3 className="text-lg text-black font-medium">
							Product Delivered
							{stepsCompleted.delivered ? (
								<span className="text-sm font-normal text-gray-500 ml-2">
									{getStatusDate("delivered")}
								</span>
							) : (
								<span className="text-sm font-normal text-gray-500 ml-2">
									Pending
								</span>
							)}
						</h3>
						<p className="text-gray-600">
							Package will be marked as delivered once you confirm receipt
						</p>
						{currentView === "inTransit" && !stepsCompleted.delivered && (
							<button
								className="mt-4 bg-black text-white py-2 px-4 text-sm rounded-md"
								onClick={() => setConfirmModalOpen(true)}
							>
								Confirm Product Receipt
							</button>
						)}
					</div>
				</div>

				{/* Dotted line */}
				<div className="flex">
					<div className="ml-6 flex justify-center">
						<div
							className="w-0.5 h-16"
							style={{
								backgroundImage:
									"linear-gradient(to bottom, #fdba74 50%, transparent 50%)",
								backgroundSize: "1px 8px",
							}}
						></div>
					</div>
				</div>

				{/* Step 6: Content Creation */}
				<div className="flex mb-4">
					<div className="mr-4">
						<div
							className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.contentCreation ? "bg-orange-500 border-4 border-[#FFBF9B]" : "bg-gray-300 border-4 border-gray-200"}`}
						>
							<Check className="text-white" size={24} />
						</div>
					</div>
					<div className="flex-1">
						<h3 className="text-lg text-black font-medium">
							Content Creation Period Begins
							{stepsCompleted.contentCreation ? (
								<span className="text-sm font-normal text-gray-500 ml-2">
									{formatDate({ seconds: Date.now() / 1000 - 86400 * 2 })}
								</span>
							) : (
								<span className="text-sm font-normal text-gray-500 ml-2">
									After delivery
								</span>
							)}
						</h3>
						<p className="text-gray-600">
							{stepsCompleted.contentCreation
								? "You'll have 14 days to create and submit your content"
								: "You begin once your Package is Delivered"}
						</p>
						{stepsCompleted.delivered && !stepsCompleted.contentCreation && (
							<button
								className="mt-4 text-sm bg-green-700 text-white py-2 px-4 rounded-md"
								onClick={handleBeginContentCreation}
							>
								Begin Creating Content
							</button>
						)}
					</div>
				</div>
			</div>

			{/* Right sidebar with delivery info */}
			<div className="md:w-96 h-fit border border-[#FFBF9B] rounded-lg p-6">
				<div className="mb-6">
					<div className="flex justify-between items-center mb-2">
						<h3 className="text-base text-black font-medium">
							Delivery Status
						</h3>
						<div className="flex items-center">
							{currentView === "pending" && (
								<span className="text-base text-black font-medium">
									Pending Delivery
								</span>
							)}
							{currentView === "inTransit" && (
								<>
									<span className="text-base text-black font-medium">
										In Transit
									</span>
									<Image
										src="/icons/transit.svg"
										alt="Transit Icon"
										className="ml-1"
										width={18}
										height={18}
									/>
								</>
							)}
							{currentView === "delivered" && (
								<>
									<span className="text-base text-black font-medium">
										Delivered
									</span>
									<Image
										src="/icons/delivered.svg"
										alt="Delivered Icon"
										className="ml-1"
										width={18}
										height={18}
									/>
								</>
							)}
						</div>
					</div>
					<div className="border-t pt-2">
						<div className="flex justify-between py-1">
							<span className="text-gray-600">Shipped Date:</span>
							<span className="text-black">
								{deliveryData.shippedDate
									? formatDate(deliveryData.shippedDate)
									: "Not Yet Shipped"}
							</span>
						</div>
						<div className="flex justify-between py-1">
							<span className="text-gray-600">Est. Delivery:</span>
							<span className=" text-black">
								{deliveryData.estimatedDeliveryDate
									? deliveryData.estimatedDeliveryDate.from &&
										deliveryData.estimatedDeliveryDate.to
										? formatDateRange(
												deliveryData.estimatedDeliveryDate.from,
												deliveryData.estimatedDeliveryDate.to
											)
										: formatDate(deliveryData.estimatedDeliveryDate)
									: "Not Yet Shipped"}
							</span>
						</div>
						<div className="flex justify-between py-1">
							<span className="text-gray-600">Content Due:</span>
							<span className=" text-black">
								{deliveryData.contentDueDate
									? formatDate(deliveryData.contentDueDate)
									: "Not Yet Shipped"}
							</span>
						</div>
					</div>
				</div>

				<div className="mb-6">
					<h3 className="text-base text-black font-medium mb-2">
						Shipping Address
					</h3>
					<div className="border-t pt-2 text-black">
						<p className="font-medium text-black">
							{deliveryData.shippingAddress.name}
						</p>
						<p>{deliveryData.shippingAddress.street}</p>
						<p>
							{deliveryData.shippingAddress.city},{" "}
							{deliveryData.shippingAddress.state}{" "}
							{deliveryData.shippingAddress.zipCode}
						</p>
						<p>{deliveryData.shippingAddress.phone}</p>
					</div>
				</div>

				<div className="mb-6">
					<h3 className="text-base text-black font-medium mb-2">
						Product Information
					</h3>
					<div className="border-t pt-2 text-black">
						<p className="font-medium text-black">{deliveryData.productName}</p>
						<p>
							{deliveryData.productQuantity} x {deliveryData.productType}
						</p>
						<p className="mt-1">
							Please use all product features in your content
						</p>
					</div>
				</div>

				<button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-md flex justify-center items-center">
					<Image
						src="/icons/messageIcon.svg"
						alt="Message brand"
						width={18}
						height={18}
						className="mr-2"
					/>
					Message Brand
				</button>
			</div>

			{/* Confirmation Modal */}
			{confirmModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-xl p-6 max-w-md w-full">
						<h2 className="text-xl text-black font-semibold mb-4">
							Confirm Product Receipt
						</h2>
						<p className="text-gray-700 mb-6">
							By confirming receipt, you acknowledge that you have received the
							product <span>{deliveryData.productName}</span> and are ready to
							begin the content creation process.
						</p>
						<div className="flex justify-end space-x-4">
							<button
								className="py-2 px-4 text-gray-600"
								onClick={() => setConfirmModalOpen(false)}
							>
								Cancel
							</button>
							<button
								className="bg-orange-500 text-white py-2 px-6 rounded-md flex items-center"
								onClick={handleConfirmReceipt}
							>
								Confirm Receipt
								<Check size={18} className="ml-2" />
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

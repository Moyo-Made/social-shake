/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react";
import { Check, Copy } from "lucide-react";
import Image from "next/image";

// Define types for our API responses
interface ShippingAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface StatusHistoryItem {
  status: string;
  timestamp: { seconds: number };
  description: string;
}

interface DeliveryData {
  id?: string;
  projectId: string;
  userId?: string;
  receiptConfirmed?: boolean;
  currentStatus: string;
  actualDeliveryDate?: { seconds: number };
  statusHistory: StatusHistoryItem[];
  productName?: string;
  productQuantity?: number;
  productType?: string;
  shippingAddress: ShippingAddress;
  estimatedDeliveryDate?: {
    from?: { seconds: number };
    to?: { seconds: number };
  };
  contentDueDate?: { seconds: number };
  shippedDate?: { seconds: number };
  contentCreationStarted?: boolean;
  trackingNumber?: string;
  carrier?: string;
  deliveryTime?: string;
  [key: string]: any;
}

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

// API functions for fetching delivery data and updating status
const deliveryApi = {
  getDeliveryStatus: async (applicationId: string) => {
    try {
      const response = await fetch(`/api/project-applications?applicationId=${applicationId}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching delivery status:", error);
      throw error;
    }
  },
  
  confirmProductReceipt: async (applicationId: string) => {
    try {
      const response = await fetch(`/api/project-applications?applicationId=${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: "approved" }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error confirming receipt:", error);
      throw error;
    }
  },
  
  beginContentCreation: async (applicationId: string) => {
    try {
      const response = await fetch(`/api/project-applications?applicationId=${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: "approved", 
          contentCreationStarted: true,
          currentStatus: "content_creation"
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error beginning content creation:", error);
      throw error;
    }
  },
};

interface DeliveryTrackingProps {
  projectId?: string;
  applicationId?: string;
}

export default function DeliveryTracking({ projectId, applicationId }: DeliveryTrackingProps) {
  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState("pending"); // 'pending', 'inTransit', 'delivered'
  const [error, setError] = useState<string | null>(null);

  // Debug log to check if applicationId is being received
  console.log("DeliveryTracking component received applicationId:", applicationId);

  useEffect(() => {
    const fetchDeliveryStatus = async () => {
      if (!applicationId || applicationId.trim() === "") {
        console.error("Missing applicationId prop:", applicationId);
        setError("Application ID is required");
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching data for applicationId:", applicationId);
        const result = await deliveryApi.getDeliveryStatus(applicationId);
        console.log("API result:", result);
        
        // Process the application data into delivery data format
        if (result) {
          // Initialize default status history if not present
          const statusHistory = result.statusHistory || [];
          
          // Create a standard delivery data structure
          const processedData: DeliveryData = {
            id: result.id,
            projectId: result.projectId || projectId || "",
            userId: result.userId,
            currentStatus: result.status === "approved" ? "shipped" : result.status,
            shippingAddress: result.shippingAddress || {
              addressLine1: "",
              addressLine2: "",
              city: "",
              state: "",
              zipCode: "",
              country: ""
            },
            statusHistory,
            deliveryTime: result.deliveryTime || "4-7 days",
            productName: "Product Sample", // Default until real data is provided
            productQuantity: 1,
            productType: "Sample Product" 
          };

          // Add estimated delivery dates based on deliveryTime if available
          if (result.createdAt) {
            const createdDate = new Date(result.createdAt.seconds * 1000 || Date.now());
            const minDays = parseInt(result.deliveryTime?.split("-")[0] || "4");
            const maxDays = parseInt(result.deliveryTime?.split("-")[1]?.replace(/\D/g, '') || "7");
            
            processedData.shippedDate = { seconds: createdDate.getTime() / 1000 };
            processedData.estimatedDeliveryDate = {
              from: { seconds: (createdDate.getTime() + (minDays * 24 * 60 * 60 * 1000)) / 1000 },
              to: { seconds: (createdDate.getTime() + (maxDays * 24 * 60 * 60 * 1000)) / 1000 }
            };
            
            // Calculate content due date (14 days after estimated delivery)
            processedData.contentDueDate = { 
              seconds: (createdDate.getTime() + ((maxDays + 14) * 24 * 60 * 60 * 1000)) / 1000 
            };
          }

          // Set default status history if none exists
          if (!processedData.statusHistory || processedData.statusHistory.length === 0) {
            const now = Date.now() / 1000;
            processedData.statusHistory = [
              {
                status: "preparation",
                timestamp: { seconds: now - 86400 * 3 },
                description: "The Brand is preparing your product package"
              }
            ];
            
            if (processedData.currentStatus === "shipped" || processedData.currentStatus === "approved") {
              processedData.statusHistory.push({
                status: "shipped",
                timestamp: { seconds: now - 86400 * 2 },
                description: 'Your product has been shipped'
              });
              
              processedData.statusHistory.push({
                status: "in_region",
                timestamp: { seconds: now - 86400 },
                description: 'Your product has arrived in your region'
              });
              
              if (processedData.currentStatus === "approved") {
                processedData.statusHistory.push({
                  status: "out_for_delivery",
                  timestamp: { seconds: now - 43200 }, // 12 hours ago
                  description: "Your package is on a delivery vehicle"
                });
              }
            }
          }

          setDeliveryData(processedData);

          // Set the correct view based on status
          if (
            processedData.currentStatus === "delivered" ||
            processedData.currentStatus === "content_creation"
          ) {
            setCurrentView("delivered");
          } else if (
            processedData.currentStatus === "shipped" ||
            processedData.currentStatus === "approved" ||
            processedData.currentStatus === "in_region" ||
            processedData.currentStatus === "out_for_delivery"
          ) {
            setCurrentView("inTransit");
          } else {
            setCurrentView("pending");
          }
        } else {
          setError("No delivery information found");
        }
      } catch (error) {
        console.error("Error fetching delivery status:", error);
        setError("Failed to load delivery information");
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveryStatus();
  }, [applicationId, projectId]);

  const handleConfirmReceipt = async () => {
    if (!applicationId || !deliveryData) return;
    
    setConfirmModalOpen(false);
    setLoading(true);

    try {
      const result = await deliveryApi.confirmProductReceipt(applicationId);
      if (result.success) {
        // Update delivery data with confirmed receipt
        setDeliveryData((prev) => {
          if (!prev) return null;
          
          return {
            ...prev,
            receiptConfirmed: true,
            currentStatus: "delivered",
            actualDeliveryDate: { seconds: Date.now() / 1000 },
            statusHistory: [
              ...(prev.statusHistory || []),
              {
                status: "delivered",
                timestamp: { seconds: Date.now() / 1000 },
                description: "Package delivered and receipt confirmed",
              },
            ],
          };
        });
        setCurrentView("delivered");
      }
    } catch (error) {
      console.error("Error confirming receipt:", error);
      setError("Failed to confirm receipt");
    } finally {
      setLoading(false);
    }
  };

  const handleBeginContentCreation = async () => {
    if (!applicationId || !deliveryData) return;
    
    setLoading(true);

    try {
      const result = await deliveryApi.beginContentCreation(applicationId);
      if (result.success) {
        // Update delivery data with content creation started
        setDeliveryData((prev) => {
          if (!prev) return null;
          
          return {
            ...prev,
            contentCreationStarted: true,
            currentStatus: "content_creation",
            statusHistory: [
              ...(prev.statusHistory || []),
              {
                status: "content_creation",
                timestamp: { seconds: Date.now() / 1000 },
                description: "Content creation period has begun",
              },
            ],
          };
        });
      }
    } catch (error) {
      console.error("Error beginning content creation:", error);
      setError("Failed to begin content creation");
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

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        {error} (App ID: {applicationId || "missing"})
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
      "approved",
      "in_region",
      "out_for_delivery",
      "delivered",
      "content_creation",
    ].includes(deliveryData.currentStatus),
    shipped: [
      "shipped",
      "approved",
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
      (item) => item.status === status
    );
    return historyItem ? historyItem.description : "";
  };

  // Function to get status date
  const getStatusDate = (status: string) => {
    const historyItem = deliveryData.statusHistory.find(
      (item) => item.status === status
    );
    return historyItem ? formatDate(historyItem.timestamp) : "";
  };

  // Format the shipping address for display
  const formatAddress = (address: ShippingAddress) => {
    return {
      name: "Recipient", // Default name if not provided
      street: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country
    };
  };

  const displayAddress = formatAddress(deliveryData.shippingAddress);

  return (
    <div className="flex flex-col md:flex-row w-full gap-6">
      {/* Timeline section */}
      <div className="flex-1">
        {/* Step 1: Preparation */}
        <div className="flex">
          <div className="mr-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.preparation ? "bg-orange-500 border-4 border-orange-200" : "bg-gray-300 border-4 border-gray-200"}`}
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
              className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.shipped ? "bg-orange-500 border-4 border-orange-200" : "bg-gray-300 border-4 border-gray-200"}`}
            >
              <Check className="text-white" size={24} />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg text-black font-medium">
              Product Shipped
              {stepsCompleted.shipped ? (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  {getStatusDate("shipped") || formatDate(deliveryData.shippedDate || { seconds: Date.now() / 1000 - 86400 * 2 })}
                </span>
              ) : (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  Pending
                </span>
              )}
            </h3>
            <p className="text-gray-600">
              {findStatusDescription("shipped") ||
                'Your product has been shipped'}
            </p>
            {deliveryData.trackingNumber && stepsCompleted.shipped && (
              <p className="text-orange-500 mt-1 text-sm flex items-center underline">
                {deliveryData.carrier ? `Track package with ${deliveryData.carrier}:` : 'Tracking number:'}{" "}
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
              className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.inRegion ? "bg-orange-500 border-4 border-orange-200" : "bg-gray-300 border-4 border-gray-200"}`}
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
                'Your product has arrived in your region'}
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
              className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.outForDelivery ? "bg-orange-500 border-4 border-orange-200" : "bg-gray-300 border-4 border-gray-200"}`}
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
                "Your package is on a delivery vehicle"}
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
              className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.delivered ? "bg-orange-500 border-4 border-orange-200" : "bg-gray-300 border-4 border-gray-200"}`}
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
              className={`w-12 h-12 rounded-full flex items-center justify-center ${stepsCompleted.contentCreation ? "bg-orange-500 border-4 border-orange-200" : "bg-gray-300 border-4 border-gray-200"}`}
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
      <div className="md:w-96 h-fit border border-orange-200 rounded-lg p-6">
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
              <span className="text-black">
                {deliveryData.estimatedDeliveryDate
                  ? deliveryData.estimatedDeliveryDate.from &&
                    deliveryData.estimatedDeliveryDate.to
                    ? formatDateRange(
                        deliveryData.estimatedDeliveryDate.from,
                        deliveryData.estimatedDeliveryDate.to
                      )
                    : formatDate(deliveryData.estimatedDeliveryDate?.from || { seconds: 0 })
                  : deliveryData.deliveryTime || "Not Yet Shipped"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Content Due:</span>
              <span className="text-black">
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
              {displayAddress.name}
            </p>
            <p>{displayAddress.street}</p>
            {displayAddress.addressLine2 && <p>{displayAddress.addressLine2}</p>}
            <p>
              {displayAddress.city}, {displayAddress.state} {displayAddress.zipCode}
            </p>
            <p>{displayAddress.country}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-base text-black font-medium mb-2">
            Product Information
          </h3>
          <div className="border-t pt-2 text-black">
            <p className="font-medium text-black">{deliveryData.productName || "Product Sample"}</p>
            <p>
              {deliveryData.productQuantity || 1} x {deliveryData.productType || "Product Sample"}
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

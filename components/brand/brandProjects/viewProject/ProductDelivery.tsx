"use client";

import React, { useEffect, useState } from "react";
import { Mail, Check, AlertCircle, Loader2, Search } from "lucide-react";
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
import { toast } from "sonner";
import { getAuth } from "firebase/auth";

// Define types for our data
interface DeliveryItem {
  id: string;
  creatorId: string;
  brandId: string;
  projectId: string;
  productName: string;
  productQuantity: number;
  productType: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  currentStatus: string;
  statusHistory: {
    status: string;
    timestamp: string;
    description: string;
  }[];
  createdAt: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDeliveryDate?: {
    from: string;
    to: string;
  };
  shippedDate?: string;
  actualDeliveryDate?: string;
  contentDueDate?: string;
  receiptConfirmed: boolean;
  contentCreationStarted: boolean;
  hasIssue: boolean;
  issueDescription?: string;
  creator?: CreatorProfile;
}

interface CreatorProfile {
  id: string;
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  logoUrl: string;
  bio: string;
  contentTypes: string[];
  country: string;
  socialMedia: {
    instagram: string;
    twitter: string;
    facebook: string;
    youtube: string;
    tiktok: string;
  };
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

interface Project {
  id: string;
  name: string;
  brandId: string;
  createdAt: string;
  description?: string;
}

// Status mapping for display
const STATUS_DISPLAY = {
  pending_shipment: "Pending Shipment",
  shipped: "Shipped",
  in_region: "In Region",
  out_for_delivery: "Out For Delivery",
  delivered: "Delivered",
  content_creation: "Content Creation",
  issue_reported: "Issue Reported",
};

// Convert API status to display status
const getDisplayStatus = (apiStatus: string): string => {
  return STATUS_DISPLAY[apiStatus as keyof typeof STATUS_DISPLAY] || apiStatus;
};

// Convert display status back to API status
const getApiStatus = (displayStatus: string): string => {
  const entries = Object.entries(STATUS_DISPLAY);
  const found = entries.find(([, value]) => value === displayStatus);
  return found ? found[0] : displayStatus.toLowerCase().replace(/ /g, "_");
};

const ProductDelivery: React.FC = () => {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [, setError] = useState<string | null>(null);
  const [issueDescriptions, setIssueDescriptions] = useState<
    Record<string, string>
  >({});
  const [updateLoading, setUpdateLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    creatorId: "",
    projectId: "",
    productName: "",
    productQuantity: 1,
    productType: "Physical Product",
    trackingNumber: "",
    carrier: "Default Carrier",
  });
  
  // New states for dropdown data
  const [projects, setProjects] = useState<Project[]>([]);
//   const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [projectCreators, setProjectCreators] = useState<CreatorProfile[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch projects for dropdown
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        toast.error("User not authenticated");
        return;
      }
      
      const token = await currentUser.getIdToken();
      
      const response = await fetch("/api/projects?role=brand", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
      
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoadingProjects(false);
    }
  };
  
  // Fetch creators for a specific project
  const fetchProjectCreators = async (projectId: string) => {
    try {
      setLoadingCreators(true);
      
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        toast.error("User not authenticated");
        return;
      }
      
      const token = await currentUser.getIdToken();
      
      const response = await fetch(`/api/project-applications?projectId=${projectId}&status=approved`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch project creators: ${response.statusText}`);
      }
      
      const applications = await response.json();
      
      // Fetch creator profiles for all applicants
      const creatorProfiles = await Promise.all(
        applications.map(async (app: any) => {
          try {
            const creatorResponse = await fetch(
              `/api/admin/creator-approval?userId=${app.userId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            
            if (creatorResponse.ok) {
              const data = await creatorResponse.json();
              if (data.creators && data.creators.length > 0) {
                return {
                  ...data.creators[0],
                  shippingAddress: app.shippingAddress || null,
                };
              }
            }
            return null;
          } catch (error) {
            console.error(`Error fetching creator profile:`, error);
            return null;
          }
        })
      );
      
      const filteredCreators = creatorProfiles.filter(Boolean);
      setProjectCreators(filteredCreators);
    } catch (error) {
      console.error("Error fetching project creators:", error);
      toast.error("Failed to load creators for this project", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoadingCreators(false);
    }
  };

  // Function to handle project selection
  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    setNewProduct(prev => ({ ...prev, projectId }));
    
    if (projectId) {
      fetchProjectCreators(projectId);
    } else {
      setProjectCreators([]);
    }
  };
  
  // Function to handle creator selection
  const handleCreatorChange = (creatorId: string) => {
    const selectedCreator = projectCreators.find(c => c.userId === creatorId);
    
    setNewProduct(prev => ({
      ...prev,
      creatorId,
    }));
  };

  // Function to handle form submission
  const handleCreateProduct = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    if (
      !newProduct.creatorId ||
      !newProduct.projectId ||
      !newProduct.productName
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Get shipping address from selected creator
    const selectedCreator = projectCreators.find(c => c.userId === newProduct.creatorId);
    const shippingAddress = selectedCreator?.shippingAddress;

    if (!shippingAddress) {
      toast.error("Selected creator does not have a shipping address");
      return;
    }

    const success = await createProductDelivery({
      ...newProduct,
      shippingAddress,
    });

    if (success) {
      setShowNewProductForm(false);
      setNewProduct({
        creatorId: "",
        projectId: "",
        productName: "",
        productQuantity: 1,
        productType: "Physical Product",
        trackingNumber: "",
        carrier: "Default Carrier",
      });
      setSelectedProject("");
      fetchDeliveries(); // Refresh the list after creating
    }
  };

  // Function to create a new product delivery
  const createProductDelivery = async (productData: {
    shippingAddress: DeliveryItem["shippingAddress"];
    creatorId: string;
    projectId: string;
    productName: string;
    productQuantity: number;
    productType: string;
    trackingNumber: string;
    carrier: string;
  }) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        toast.error("User not authenticated");
        return false;
      }

      // Get the authentication token
      const token = await currentUser.getIdToken();

      const response = await fetch("/api/product-deliveries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || response.statusText;
        throw new Error(`Failed to create delivery: ${errorMessage}`);
      }

      const newDelivery = await response.json();

      // Add the new delivery to the state
      setDeliveries((prevDeliveries) => [newDelivery, ...prevDeliveries]);

      toast.success("Product delivery created successfully");
      return true;
    } catch (error) {
      console.error("Error creating delivery:", error);
      toast.error("Failed to create product delivery", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  };

  // Function to fetch deliveries
  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the current user's authentication token
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const token = await currentUser.getIdToken();

      const response = await fetch(`/api/product-deliveries?role=brand`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to fetch deliveries: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.deliveries) {
        // Ensure creator profiles are attached
        const deliveriesWithCreators = await fetchCreatorProfiles(data.deliveries);
        setDeliveries(deliveriesWithCreators);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (err) {
      console.error("Error fetching deliveries:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch deliveries"
      );
      toast.error("Failed to load product deliveries", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch creator profiles for each delivery
  const fetchCreatorProfiles = async (
    deliveryItems: DeliveryItem[]
  ): Promise<DeliveryItem[]> => {
    const creatorIds = [
      ...new Set(deliveryItems.map((item) => item.creatorId)),
    ];
    const creatorMap = new Map<string, CreatorProfile>();

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      const token = await currentUser.getIdToken();

      await Promise.all(
        creatorIds.map(async (creatorId) => {
          try {
            const response = await fetch(
              `/api/admin/creator-approval?userId=${creatorId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.creators && data.creators.length > 0) {
                creatorMap.set(creatorId, data.creators[0]);
              }
            } else {
              console.warn(
                `Failed to fetch creator ${creatorId}: ${response.statusText}`
              );
            }
          } catch (error) {
            console.error(`Error fetching creator ${creatorId}:`, error);
          }
        })
      );
    } catch (error) {
      console.error("Error fetching creator profiles:", error);
    }

    // Attach creator profiles to deliveries
    return deliveryItems.map((delivery) => ({
      ...delivery,
      creator:
        creatorMap.get(delivery.creatorId) ||
        ({
          userId: delivery.creatorId,
          username: "Unknown Creator",
          email: "Unknown",
          logoUrl: "/icons/creator-icon.svg",
        } as CreatorProfile),
    }));
  };

  const handleStatusChange = async (
    deliveryId: string,
    newDisplayStatus: string
  ) => {
    const newApiStatus = getApiStatus(newDisplayStatus);
    setUpdateLoading((prev) => ({ ...prev, [deliveryId]: true }));

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        toast.error("User not authenticated");
        return false;
      }

      // Get the authentication token
      const token = await currentUser.getIdToken();

      const delivery = deliveries.find((d) => d.id === deliveryId);

      if (!delivery) {
        throw new Error("Delivery not found");
      }

      const response = await fetch(
        `/api/product-deliveries/${deliveryId}?role=brand`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentStatus: newApiStatus,
            description: `Status updated to ${newDisplayStatus}`,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || response.statusText;
        throw new Error(`Failed to update status: ${errorMessage}`);
      }

      const updatedDelivery = await response.json();

      // Update the deliveries state
      setDeliveries((prevDeliveries) =>
        prevDeliveries.map((d) =>
          d.id === deliveryId ? { ...updatedDelivery, creator: d.creator } : d
        )
      );

      toast.success(`Delivery status updated to ${newDisplayStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update delivery status", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setUpdateLoading((prev) => ({ ...prev, [deliveryId]: false }));
    }
  };

  const handleTrackingNumberChange = async (
    deliveryId: string,
    trackingNumber: string,
    carrier: string = "Default Carrier"
  ) => {
    if (!trackingNumber.trim()) {
      toast.error("Please enter a valid tracking number");
      return;
    }

    setUpdateLoading((prev) => ({ ...prev, [deliveryId]: true }));

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        toast.error("User not authenticated");
        return;
      }

      const token = await currentUser.getIdToken();

      const response = await fetch(
        `/api/product-deliveries/${deliveryId}?role=brand`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            trackingNumber,
            carrier,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || response.statusText;
        throw new Error(`Failed to update tracking: ${errorMessage}`);
      }

      const updatedDelivery = await response.json();

      // Update the deliveries state
      setDeliveries((prevDeliveries) =>
        prevDeliveries.map((d) =>
          d.id === deliveryId ? { ...updatedDelivery, creator: d.creator } : d
        )
      );

      toast.success("Tracking information updated successfully");
    } catch (error) {
      console.error("Error updating tracking:", error);
      toast.error("Failed to update tracking information", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setUpdateLoading((prev) => ({ ...prev, [deliveryId]: false }));
    }
  };

  const handleIssueDescriptionChange = (
    deliveryId: string,
    description: string
  ) => {
    setIssueDescriptions((prev) => ({
      ...prev,
      [deliveryId]: description,
    }));
  };

  const reportIssue = async (deliveryId: string) => {
    const description = issueDescriptions[deliveryId];
    if (!description || !description.trim()) {
      toast.error("Please provide an issue description");
      return;
    }

    setUpdateLoading((prev) => ({ ...prev, [deliveryId]: true }));

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        toast.error("User not authenticated");
        return;
      }

      const token = await currentUser.getIdToken();

      const response = await fetch(
        `/api/product-deliveries/${deliveryId}?role=brand`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentStatus: "issue_reported",
            hasIssue: true,
            issueDescription: description,
            description: `Issue reported: ${description}`,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || response.statusText;
        throw new Error(`Failed to report issue: ${errorMessage}`);
      }

      const updatedDelivery = await response.json();

      // Update the deliveries state
      setDeliveries((prevDeliveries) =>
        prevDeliveries.map((d) =>
          d.id === deliveryId ? { ...updatedDelivery, creator: d.creator } : d
        )
      );

      // Clear the issue description
      setIssueDescriptions((prev) => {
        const newState = { ...prev };
        delete newState[deliveryId];
        return newState;
      });

      toast.success("Issue reported successfully");
    } catch (error) {
      console.error("Error reporting issue:", error);
      toast.error("Failed to report issue", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setUpdateLoading((prev) => ({ ...prev, [deliveryId]: false }));
    }
  };

  const notifyCreator = async (deliveryId: string) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        toast.error("User not authenticated");
        return;
      }

      const token = await currentUser.getIdToken();
      
      const delivery = deliveries.find((d) => d.id === deliveryId);
      if (!delivery) {
        throw new Error("Delivery not found");
      }

      // In a real implementation, you would call an API endpoint here
      // For now, we'll just show a toast success message
      toast.success("Notification Sent", {
        description: `The creator has been notified about this delivery`,
      });
    } catch (error) {
      console.error("Error notifying creator:", error);
      toast.error("Failed to notify creator", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Format the status for display with proper badge styling
  const getStatusBadge = (status: string) => {
    const displayStatus = getDisplayStatus(status);
    let badgeClass =
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ";

    switch (displayStatus) {
      case "Pending Shipment":
        badgeClass += "bg-[#FFF0C3] border border-[#FDD849] text-[#1A1A1A]";
        return (
          <div className={badgeClass}>
            <span className="mr-1 mb-0.5">•</span>
            {displayStatus}
          </div>
        );
      case "Shipped":
      case "In Region":
      case "Out For Delivery":
        badgeClass += "bg-[#FFE5FB] border border-[#FC52E4] text-[#FC52E4]";
        return (
          <div className={badgeClass}>
            <span className="mr-1 mb-0.5">•</span>
            {displayStatus}
          </div>
        );
      case "Delivered":
      case "Content Creation":
        badgeClass += "bg-[#ECFDF3] border border-[#ABEFC6] text-[#067647]";
        return (
          <div className={badgeClass}>
            <Check className="w-3 h-3 mr-1" />
            {displayStatus}
          </div>
        );
      case "Issue Reported":
        badgeClass += "bg-red-100 text-red-800";
        return (
          <div className={badgeClass}>
            <AlertCircle className="w-3 h-3 mr-1" />
            {displayStatus}
          </div>
        );
      default:
        badgeClass += "bg-gray-100 text-gray-800";
        return <div className={badgeClass}>{displayStatus}</div>;
    }
  };

  // Format the date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  // Get the last updated date from status history
  const getLastUpdatedDate = (delivery: DeliveryItem) => {
    if (!delivery.statusHistory || delivery.statusHistory.length === 0) {
      return formatDate(delivery.createdAt);
    }

    const sortedHistory = [...delivery.statusHistory].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return formatDate(sortedHistory[0].timestamp);
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchDeliveries();
    fetchProjects();
  }, []);

  // Filter deliveries based on search term
  const filteredDeliveries = deliveries.filter(delivery => {
    if (!searchTerm) return true;
    
    const creatorName = `${delivery.creator?.firstName || ''} ${delivery.creator?.lastName || ''} ${delivery.creator?.username || ''}`.toLowerCase();
    const productName = delivery.productName.toLowerCase();
    const status = getDisplayStatus(delivery.currentStatus).toLowerCase();
    const search = searchTerm.toLowerCase();
    
    return creatorName.includes(search) || 
           productName.includes(search) || 
           status.includes(search);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="mt-4 text-gray-600">Loading deliveries...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto rounded-lg shadow-sm space-y-4">
      <div className="mb-6">
        <Button
          onClick={() => setShowNewProductForm(!showNewProductForm)}
          className="w-full mb-4"
        >
          {showNewProductForm ? "Cancel" : "Add New Product Delivery"}
        </Button>

        {showNewProductForm && (
          <Card className="p-4 mb-6">
            <h3 className="text-lg font-medium mb-4">
              Create New Product Delivery
            </h3>
            <form onSubmit={handleCreateProduct}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Project*
                  </label>
                  <Select
                    value={selectedProject}
                    onValueChange={handleProjectChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingProjects ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Loading...
                        </div>
                      ) : projects.length === 0 ? (
                        <div className="py-2 px-2 text-gray-500">No projects found</div>
                      ) : (
                        projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Creator*
                  </label>
                  <Select
                    value={newProduct.creatorId}
                    onValueChange={handleCreatorChange}
                    disabled={!selectedProject || loadingCreators}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={selectedProject ? "Select a creator" : "Select a project first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingCreators ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Loading creators...
                        </div>
                      ) : !selectedProject ? (
                        <div className="py-2 px-2 text-gray-500">Select a project first</div>
                      ) : projectCreators.length === 0 ? (
                        <div className="py-2 px-2 text-gray-500">No approved creators for this project</div>
                      ) : (
                        projectCreators.map((creator) => (
                          <SelectItem key={creator.userId} value={creator.userId}>
                            {creator.firstName} {creator.lastName} ({creator.username})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Product Name*
                  </label>
                  <Input
                    required
                    value={newProduct.productName}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        productName: e.target.value,
                      })
                    }
                    placeholder="Product Name"
                  />
                </div>
                
                <div>
  <label className="text-sm font-medium text-gray-700 block mb-1">
    Quantity
  </label>
  <Input
    type="number"
    min="1"
    value={newProduct.productQuantity}
    onChange={(e) =>
      setNewProduct({
        ...newProduct,
        productQuantity: parseInt(e.target.value) || 1,
      })
    }
    placeholder="Quantity"
  />
</div>
<div>
  <label className="text-sm font-medium text-gray-700 block mb-1">
    Product Type
  </label>
  <Input
    value={newProduct.productType}
    onChange={(e) =>
      setNewProduct({
        ...newProduct,
        productType: e.target.value,
      })
    }
    placeholder="Product Type"
  />
</div>
<div>
  <label className="text-sm font-medium text-gray-700 block mb-1">
    Tracking Number (optional)
  </label>
  <Input
    value={newProduct.trackingNumber}
    onChange={(e) =>
      setNewProduct({
        ...newProduct,
        trackingNumber: e.target.value,
      })
    }
    placeholder="Tracking Number"
  />
</div>
<div>
  <label className="text-sm font-medium text-gray-700 block mb-1">
    Carrier (optional)
  </label>
  <Input
    value={newProduct.carrier}
    onChange={(e) =>
      setNewProduct({ ...newProduct, carrier: e.target.value })
    }
    placeholder="Carrier"
  />
</div>

</div>
<div className="mt-4 flex justify-end">
  <Button
    type="submit"
    className="bg-orange-500 hover:bg-orange-600 text-white"
  >
    Create Delivery
  </Button>
</div>
</form>
</Card>
)}
</div>

{/* Search Bar */}
<div className="mb-4">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
    <Input
      placeholder="Search by creator, product, or status..."
      className="pl-10"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  </div>
</div>

{filteredDeliveries.length === 0 ? (
  <div className="text-center py-12 bg-gray-50 rounded-lg">
    <p className="text-gray-500">No deliveries found.</p>
    {searchTerm && (
      <p className="text-gray-400 text-sm mt-2">Try adjusting your search criteria.</p>
    )}
  </div>
) : (
  filteredDeliveries.map((delivery) => (
    <Card key={delivery.id} className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0 mr-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200">
              <Image
                src={delivery.creator?.logoUrl || "/icons/creator-icon.svg"}
                alt={delivery.creator?.username || "Creator"}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="flex-grow">
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {delivery.creator?.firstName}{" "}
                  {delivery.creator?.lastName ||
                    delivery.creator?.username ||
                    "Unknown Creator"}
                </h3>
                <p className="text-sm text-gray-600">
                  Email: {delivery.creator?.email || "Unknown"}
                </p>
                <div className="mt-1">
                  <span className="text-sm text-gray-600">
                    Product: {delivery.productName} (x
                    {delivery.productQuantity})
                  </span>
                </div>
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
              <div className="text-left sm:text-right mt-2 sm:mt-0">
                {getStatusBadge(delivery.currentStatus)}
                <p className="text-sm text-gray-600 mt-1">
                  Updated On: {getLastUpdatedDate(delivery)}
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
              value={getDisplayStatus(delivery.currentStatus)}
              onValueChange={(value) =>
                handleStatusChange(delivery.id, value)
              }
              disabled={updateLoading[delivery.id]}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending Shipment">
                  Pending Shipment
                </SelectItem>
                <SelectItem value="Shipped">Shipped</SelectItem>
                <SelectItem value="In Region">In Region</SelectItem>
                <SelectItem value="Out For Delivery">
                  Out For Delivery
                </SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
                <SelectItem value="Content Creation">Content Creation</SelectItem>
                <SelectItem value="Issue Reported">
                  Report an Issue
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(delivery.currentStatus === "shipped" ||
            getDisplayStatus(delivery.currentStatus) === "Shipped") && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Tracking Number
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter Tracking Number"
                  value={delivery.trackingNumber || ""}
                  onChange={(e) => {
                    const newDeliveries = deliveries.map((d) =>
                      d.id === delivery.id
                        ? { ...d, trackingNumber: e.target.value }
                        : d
                    );
                    setDeliveries(newDeliveries);
                  }}
                  disabled={updateLoading[delivery.id]}
                />
                <Button
                  onClick={() =>
                    handleTrackingNumberChange(
                      delivery.id,
                      delivery.trackingNumber || "",
                      delivery.carrier || "Default Carrier"
                    )
                  }
                  disabled={
                    !delivery.trackingNumber || updateLoading[delivery.id]
                  }
                >
                  {updateLoading[delivery.id] ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          )}

          {getDisplayStatus(delivery.currentStatus) ===
            "Issue Reported" && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Issue Description
              </label>
              <Textarea
                rows={4}
                placeholder="Describe the Issue in detail"
                value={
                  delivery.issueDescription ||
                  issueDescriptions[delivery.id] ||
                  ""
                }
                onChange={(e) =>
                  handleIssueDescriptionChange(delivery.id, e.target.value)
                }
                disabled={
                  !!delivery.issueDescription || updateLoading[delivery.id]
                }
              />
              {!delivery.issueDescription && (
                <Button
                  className="mt-2"
                  onClick={() => reportIssue(delivery.id)}
                  disabled={
                    !issueDescriptions[delivery.id] ||
                    updateLoading[delivery.id]
                  }
                >
                  {updateLoading[delivery.id] ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Submit Issue
                </Button>
              )}
            </div>
          )}

          {/* Show shipping address */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Shipping Address
            </label>
            <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
              {delivery.shippingAddress ? (
                <>
                  <p>{delivery.shippingAddress.street}</p>
                  <p>
                    {delivery.shippingAddress.city},{" "}
                    {delivery.shippingAddress.state}{" "}
                    {delivery.shippingAddress.zipCode}
                  </p>
                  <p>{delivery.shippingAddress.country}</p>
                </>
              ) : (
                <p>No shipping address provided</p>
              )}
            </div>
          </div>

          {/* Show delivery dates if available */}
          {delivery.estimatedDeliveryDate && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Estimated Delivery
              </label>
              <p className="text-sm text-gray-600">
                {formatDate(delivery.estimatedDeliveryDate.from)} -{" "}
                {formatDate(delivery.estimatedDeliveryDate.to)}
              </p>
            </div>
          )}

          {delivery.contentDueDate && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Content Due Date
              </label>
              <p className="text-sm text-gray-600">
                {formatDate(delivery.contentDueDate)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="px-4 pb-4 pt-0">
        <Button
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          onClick={() => notifyCreator(delivery.id)}
          disabled={updateLoading[delivery.id]}
        >
          <span>Notify Creator</span>
          <Mail className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  ))
)}
</div>
);
};

export default ProductDelivery;
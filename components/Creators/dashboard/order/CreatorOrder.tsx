import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  DollarSign, 
  FileText, 
  Video, 
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  Upload,
} from "lucide-react";

interface OrderData {
  id: string;
  brandName: string;
  brandEmail: string;
  packageType: string;
  videoCount: number;
  totalPrice: number;
  scriptChoice: "brand-written" | "creator-written";
  status: "pending" | "accepted" | "in-progress" | "delivered" | "completed" | "rejected";
  createdAt: string;
  deadline: string;
  
  // Script data
  scriptFormData: {
    scripts: Array<{
      id: string;
      title: string;
      content: string;
      duration?: string;
      notes?: string;
    }>;
    generalRequirements: {
      tone?: string;
      style?: string;
      callToAction?: string;
      keyMessages?: string[];
    };
    videoSpecs: {
      format?: string;
      duration?: string;
      orientation?: string;
      quality?: string;
    };
  };
  
  // Project brief data
  projectBriefData: {
    projectOverview: {
      campaignName?: string;
      objective?: string;
      targetAudience?: string;
      keyMessage?: string;
    };
    contentRequirements: {
      mustInclude?: string[];
      avoid?: string[];
      tone?: string;
      style?: string;
    };
    brandGuidelines: {
      colors?: string[];
      fonts?: string[];
      logo?: string;
      brandVoice?: string;
    };
    videoSpecs: {
      format?: string;
      duration?: string;
      resolution?: string;
      deliveryFormat?: string;
    };
    examples: {
      referenceVideos?: string[];
      competitorExamples?: string[];
      stylePreferences?: string;
    };
    timeline: {
      deliveryDate?: string;
      milestones?: Array<{
        phase: string;
        date: string;
        description: string;
      }>;
    };
  };
}

interface CreatorOrderViewProps {
  orders: OrderData[];
  onOrderAction: (orderId: string, action: string, data?: { reason?: string } | undefined) => void;
  onMessageBrand: (orderId: string) => void;
  onUploadDeliverable: (orderId: string, files: FileList) => void;
}

const CreatorOrderView: React.FC<CreatorOrderViewProps> = ({
  orders,
  onOrderAction,
  onMessageBrand,
  onUploadDeliverable
}) => {
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "accepted": return "bg-blue-100 text-blue-800";
      case "in-progress": return "bg-purple-100 text-purple-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "completed": return "bg-green-200 text-green-900";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPackageDisplayName = (packageType: string) => {
    switch (packageType) {
      case "one": return "1 Custom Video";
      case "three": return "3 Custom Videos";
      case "five": return "5 Custom Videos";
      case "bulk": return "Bulk Videos (6+)";
      default: return packageType;
    }
  };

  const handleAcceptOrder = () => {
    if (selectedOrder) {
      onOrderAction(selectedOrder.id, "accept");
    }
  };

  const handleRejectOrder = () => {
    if (selectedOrder && rejectReason.trim()) {
      onOrderAction(selectedOrder.id, "reject", { reason: rejectReason });
      setShowRejectModal(false);
      setRejectReason("");
    }
  };

  const handleStartWork = () => {
    if (selectedOrder) {
      onOrderAction(selectedOrder.id, "start-work");
    }
  };

  const handleMarkDelivered = () => {
    if (selectedOrder) {
      onOrderAction(selectedOrder.id, "mark-delivered");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!selectedOrder) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Your Orders</h2>
        
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
            <p className="text-gray-500">New orders from brands will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{order.brandName}</h3>
                      <p className="text-gray-600">{getPackageDisplayName(order.packageType)}</p>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.replace('-', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{order.videoCount} videos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">${order.totalPrice}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        {getDaysUntilDeadline(order.deadline)} days left
                      </span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setSelectedOrder(order)}
                    className="w-full"
                    variant="outline"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="outline" 
          onClick={() => setSelectedOrder(null)}
          className="mb-4"
        >
          ← Back to Orders
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onMessageBrand(selectedOrder.id)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Message Brand
          </Button>
        </div>
      </div>

      {/* Order Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">{selectedOrder.brandName}</h1>
            <p className="text-gray-600">{getPackageDisplayName(selectedOrder.packageType)}</p>
          </div>
          <Badge className={getStatusColor(selectedOrder.status)} variant="secondary">
            {selectedOrder.status.replace('-', ' ').toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Video className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Videos</span>
            </div>
            <span className="font-semibold">{selectedOrder.videoCount}</span>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Total Price</span>
            </div>
            <span className="font-semibold text-green-600">${selectedOrder.totalPrice}</span>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Deadline</span>
            </div>
            <span className="font-semibold">{formatDate(selectedOrder.deadline)}</span>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Days Left</span>
            </div>
            <span className={`font-semibold ${
              getDaysUntilDeadline(selectedOrder.deadline) < 3 ? 'text-red-600' : 'text-green-600'
            }`}>
              {getDaysUntilDeadline(selectedOrder.deadline)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          {selectedOrder.status === "pending" && (
            <>
              <Button onClick={handleAcceptOrder} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Accept Order
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowRejectModal(true)}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Order
              </Button>
            </>
          )}
          
          {selectedOrder.status === "accepted" && (
            <Button onClick={handleStartWork} className="bg-blue-600 hover:bg-blue-700">
              Start Working
            </Button>
          )}
          
          {selectedOrder.status === "in-progress" && (
            <Button onClick={handleMarkDelivered} className="bg-green-600 hover:bg-green-700">
              Mark as Delivered
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scripts">Scripts</TabsTrigger>
          <TabsTrigger value="brief">Project Brief</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedOrder.projectBriefData.projectOverview.campaignName && (
                <div>
                  <h4 className="font-medium">Campaign Name</h4>
                  <p className="text-gray-600">{selectedOrder.projectBriefData.projectOverview.campaignName}</p>
                </div>
              )}
              
              {selectedOrder.projectBriefData.projectOverview.objective && (
                <div>
                  <h4 className="font-medium">Objective</h4>
                  <p className="text-gray-600">{selectedOrder.projectBriefData.projectOverview.objective}</p>
                </div>
              )}
              
              {selectedOrder.projectBriefData.projectOverview.targetAudience && (
                <div>
                  <h4 className="font-medium">Target Audience</h4>
                  <p className="text-gray-600">{selectedOrder.projectBriefData.projectOverview.targetAudience}</p>
                </div>
              )}
              
              {selectedOrder.projectBriefData.projectOverview.keyMessage && (
                <div>
                  <h4 className="font-medium">Key Message</h4>
                  <p className="text-gray-600">{selectedOrder.projectBriefData.projectOverview.keyMessage}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedOrder.projectBriefData.brandGuidelines.brandVoice && (
                <div>
                  <h4 className="font-medium">Brand Voice</h4>
                  <p className="text-gray-600">{selectedOrder.projectBriefData.brandGuidelines.brandVoice}</p>
                </div>
              )}
              
              {selectedOrder.projectBriefData.brandGuidelines.colors && 
               selectedOrder.projectBriefData.brandGuidelines.colors.length > 0 && (
                <div>
                  <h4 className="font-medium">Brand Colors</h4>
                  <div className="flex gap-2 flex-wrap">
                    {selectedOrder.projectBriefData.brandGuidelines.colors.map((color, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scripts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Scripts ({selectedOrder.scriptChoice === "brand-written" ? "Provided by Brand" : "To be Written by Creator"})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedOrder.scriptFormData.scripts.length > 0 ? (
                <div className="space-y-4">
                  {selectedOrder.scriptFormData.scripts.map((script, index) => (
                    <div key={script.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium">Script {index + 1}: {script.title}</h4>
                        {script.duration && (
                          <Badge variant="outline">{script.duration}</Badge>
                        )}
                      </div>
                      <div className="bg-gray-50 p-3 rounded mb-3">
                        <pre className="whitespace-pre-wrap text-sm">{script.content}</pre>
                      </div>
                      {script.notes && (
                        <div>
                          <h5 className="font-medium text-sm mb-1">Notes:</h5>
                          <p className="text-sm text-gray-600">{script.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {selectedOrder.scriptChoice === "creator-written" 
                    ? "You'll need to write the scripts for this project"
                    : "No scripts provided yet"
                  }
                </div>
              )}

              {/* General Requirements */}
              {selectedOrder.scriptFormData.generalRequirements && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium mb-3">General Requirements</h4>
                  <div className="grid gap-3">
                    {selectedOrder.scriptFormData.generalRequirements.tone && (
                      <div>
                        <span className="text-sm text-gray-600">Tone: </span>
                        <span className="text-sm">{selectedOrder.scriptFormData.generalRequirements.tone}</span>
                      </div>
                    )}
                    {selectedOrder.scriptFormData.generalRequirements.style && (
                      <div>
                        <span className="text-sm text-gray-600">Style: </span>
                        <span className="text-sm">{selectedOrder.scriptFormData.generalRequirements.style}</span>
                      </div>
                    )}
                    {selectedOrder.scriptFormData.generalRequirements.callToAction && (
                      <div>
                        <span className="text-sm text-gray-600">Call to Action: </span>
                        <span className="text-sm">{selectedOrder.scriptFormData.generalRequirements.callToAction}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brief" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedOrder.projectBriefData.contentRequirements.mustInclude && 
               selectedOrder.projectBriefData.contentRequirements.mustInclude.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-700">Must Include:</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {selectedOrder.projectBriefData.contentRequirements.mustInclude.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {selectedOrder.projectBriefData.contentRequirements.avoid && 
               selectedOrder.projectBriefData.contentRequirements.avoid.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700">Avoid:</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {selectedOrder.projectBriefData.contentRequirements.avoid.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {selectedOrder.projectBriefData.contentRequirements.tone && (
                <div>
                  <h4 className="font-medium">Tone</h4>
                  <p className="text-gray-600">{selectedOrder.projectBriefData.contentRequirements.tone}</p>
                </div>
              )}
              
              {selectedOrder.projectBriefData.contentRequirements.style && (
                <div>
                  <h4 className="font-medium">Style</h4>
                  <p className="text-gray-600">{selectedOrder.projectBriefData.contentRequirements.style}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Video Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {selectedOrder.projectBriefData.videoSpecs.format && (
                  <div>
                    <h4 className="font-medium">Format</h4>
                    <p className="text-gray-600">{selectedOrder.projectBriefData.videoSpecs.format}</p>
                  </div>
                )}
                
                {selectedOrder.projectBriefData.videoSpecs.duration && (
                  <div>
                    <h4 className="font-medium">Duration</h4>
                    <p className="text-gray-600">{selectedOrder.projectBriefData.videoSpecs.duration}</p>
                  </div>
                )}
                
                {selectedOrder.projectBriefData.videoSpecs.resolution && (
                  <div>
                    <h4 className="font-medium">Resolution</h4>
                    <p className="text-gray-600">{selectedOrder.projectBriefData.videoSpecs.resolution}</p>
                  </div>
                )}
                
                {selectedOrder.projectBriefData.videoSpecs.deliveryFormat && (
                  <div>
                    <h4 className="font-medium">Delivery Format</h4>
                    <p className="text-gray-600">{selectedOrder.projectBriefData.videoSpecs.deliveryFormat}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedOrder.projectBriefData.examples && (
            <Card>
              <CardHeader>
                <CardTitle>Reference Examples</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedOrder.projectBriefData.examples.referenceVideos && 
                 selectedOrder.projectBriefData.examples.referenceVideos.length > 0 && (
                  <div>
                    <h4 className="font-medium">Reference Videos</h4>
                    <div className="space-y-2">
                      {selectedOrder.projectBriefData.examples.referenceVideos.map((video, index) => (
                        <a 
                          key={index} 
                          href={video} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:underline"
                        >
                          {video}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedOrder.projectBriefData.examples.stylePreferences && (
                  <div>
                    <h4 className="font-medium">Style Preferences</h4>
                    <p className="text-gray-600">{selectedOrder.projectBriefData.examples.stylePreferences}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="deliverables" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Deliverables
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedOrder.status === "in-progress" ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Upload your videos</h3>
                    <p className="text-gray-600 mb-4">
                      Drag and drop your video files here, or click to browse
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="video/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          onUploadDeliverable(selectedOrder.id, e.target.files);
                        }
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <span className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        Choose Files
                      </span>
                    </label>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>• Upload all {selectedOrder.videoCount} videos at once or separately</p>
                    <p>• Supported formats: MP4, MOV, AVI</p>
                    <p>• Maximum file size: 500MB per video</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {selectedOrder.status === "pending" || selectedOrder.status === "accepted" 
                    ? "Start working on the project to upload deliverables"
                    : "Deliverables section will be available once you start working"
                  }
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Order Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reject Order</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this order:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 h-24 resize-none"
              placeholder="Enter your reason here..."
            />
            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleRejectOrder}
                disabled={!rejectReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                Reject Order
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorOrderView;
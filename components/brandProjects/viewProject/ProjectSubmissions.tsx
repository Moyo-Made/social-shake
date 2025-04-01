"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, Download, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import ReviewVideoModal from "./VideoReviewModal";
import ProjectApprovalModal from "./ProjectApprovalModal";

// Types
export interface Submission {
	id: string;
	creatorName: string;
	creatorIcon: string;
	videoNumber: string;
	revisionNumber: string;
	status: "submitted" | "approved" | "new";
	submittedAt: string;
	thumbnail: string;
	product: "skincare" | "supplement";
}

// Mock data
export const submissions: Submission[] = [
	{
		id: "1",
		creatorName: "Melinda Roshovelle",
		creatorIcon: "/icons/creator-icon.svg",
		videoNumber: "#2",
		revisionNumber: "#2",
		status: "submitted",
		submittedAt: "Mar 28, 11:29pm",
		thumbnail: "/images/submission1.svg",
		product: "skincare",
	},
	{
		id: "2",
		creatorName: "Colina Smith",
		creatorIcon: "/icons/creator-icon.svg",
		videoNumber: "#2",
		revisionNumber: "#2",
		status: "submitted",
		submittedAt: "Mar 28, 11:29pm",
		thumbnail: "/images/submission2.svg",
		product: "supplement",
	},
	{
		id: "3",
		creatorName: "Olumise Web",
		creatorIcon: "/icons/creator-icon.svg",
		videoNumber: "#2",
		revisionNumber: "",
		status: "approved",
		submittedAt: "Mar 28, 11:29pm",
		thumbnail: "/images/submission3.svg",
		product: "skincare",
	},
	{
		id: "4",
		creatorName: "Melinda Roshovelle",
		creatorIcon: "/icons/creator-icon.svg",
		videoNumber: "#1",
		revisionNumber: "",
		status: "approved",
		submittedAt: "Mar 28, 11:29pm",
		thumbnail: "/images/submission3.svg",
		product: "skincare",
	},
	{
		id: "5",
		creatorName: "Colina Smith",
		creatorIcon: "/icons/creator-icon.svg",
		videoNumber: "#2",
		revisionNumber: "#2",
		status: "submitted",
		submittedAt: "Mar 28, 11:29pm",
		thumbnail: "/images/submission2.svg",
		product: "supplement",
	},
	{
		id: "6",
		creatorName: "Melinda Roshovelle",
		creatorIcon: "/icons/creator-icon.svg",
		videoNumber: "#1",
		revisionNumber: "",
		status: "new",
		submittedAt: "Mar 28, 11:29pm",
		thumbnail: "/images/submission1.svg",
		product: "skincare",
	},
];

export default function ProjectSubmissions() {
  const [activeView, setActiveView] = useState<"project" | "creator">("creator");
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null);
  const [revisionUsed, setRevisionUsed] = useState<number>(1);
  const [maxRevisions] = useState<number>(3);
  const [submissionsList, setSubmissionsList] = useState<Submission[]>(submissions);
  const [expandedCreators, setExpandedCreators] = useState<Record<string, boolean>>({
    "Melinda Roshovelle": true,
    "Colina Smith": false,
  });

  // Group submissions by creator
  const groupedSubmissions = submissionsList.reduce((groups, submission) => {
    if (!groups[submission.creatorName]) {
      groups[submission.creatorName] = [];
    }
    groups[submission.creatorName].push(submission);
    return groups;
  }, {} as Record<string, Submission[]>);

  const totalVideos = 15;
  const completedVideos = 10;
  const completionPercentage = (completedVideos / totalVideos) * 100;

  const toggleCreatorExpand = (creatorName: string) => {
    setExpandedCreators({
      ...expandedCreators,
      [creatorName]: !expandedCreators[creatorName],
    });
  };

  const handleReview = (submission: Submission) => {
    setCurrentSubmission(submission);
    setOpenReviewDialog(true);
    setRevisionUsed(submission.id === "1" ? 1 : 2);
  };

  const handleApproveClick = (submission: Submission) => {
    setCurrentSubmission(submission);
    setOpenApproveDialog(true);
  };

  const handleApprove = () => {
    if (currentSubmission) {
      const updatedSubmissions = submissionsList.map((sub) =>
        sub.id === currentSubmission.id ? { ...sub, status: "approved" } : sub
      );

      setSubmissionsList(updatedSubmissions as Submission[]);
      setOpenApproveDialog(false);
      console.log(`Submission ${currentSubmission.id} approved`);
    }
  };

  const handleSubmit = (
    approved: boolean,
    feedback?: string,
    issues?: string[]
  ) => {
    console.log("Approved:", approved);
    console.log("Feedback:", feedback);
    console.log("Issues:", issues);

    if (approved && currentSubmission) {
      const updatedSubmissions = submissionsList.map((sub) =>
        sub.id === currentSubmission.id ? { ...sub, status: "approved" } : sub
      );

      setSubmissionsList(updatedSubmissions as Submission[]);
    }
    setOpenReviewDialog(false);
  };

  const handleCloseModals = () => {
    setOpenReviewDialog(false);
    setOpenApproveDialog(false);
    console.log("Modal closed");
  };

  // Render Project View (original grid layout)
  const renderProjectView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {submissionsList.map((submission) => (
        <Card
          key={submission.id}
          className="overflow-hidden border border-[#FFBF9BBA]"
        >
          <CardContent className="p-0">
            <div className="p-4">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden mr-2">
                  <Image
                    src={submission.creatorIcon}
                    alt={submission.creatorName}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                    priority
                  />
                </div>
                <div>
                  <div className="flex items-center">
                    <div className="text-sm text-black font-medium">
                      {submission.creatorName}
                    </div>
                    <span className="mx-2">-</span>
                    <div className="text-sm font-medium text-orange-500">
                      Video {submission.videoNumber}
                    </div>
                  </div>
                  <div className="flex text-xs text-orange-500">
                    {submission.revisionNumber && (
                      <div className="mr-4">
                        Revision {submission.revisionNumber}
                      </div>
                    )}
                    {submission.status === "new" && (
                      <Badge
                        variant="outline"
                        className="bg-orange-500 text-white rounded-full mr-2 py-1"
                      >
                        <div className="flex items-center gap-1">
                          <span className="">New</span>
                          <Image
                            src="/icons/star.svg"
                            alt="Star"
                            width={15}
                            height={15}
                          />
                        </div>
                      </Badge>
                    )}
                    <div className="flex gap-1 text-gray-500 text-xs items-center">
                      {submission.status === "approved"
                        ? "Approved:"
                        : "Submitted:"}
                      <p className="text-black text-xs">
                        {submission.submittedAt}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <Image
                  src={submission.thumbnail}
                  alt={`${submission.creatorName}'s video thumbnail`}
                  width={500}
                  height={192}
                  className="w-full object-fit rounded-md pt-2"
                />
              </div>

              <div className="mt-4 flex">
                {submission.status === "approved" ? (
                  <Button
                    variant="secondary"
                    className="flex-grow bg-[#FD5C02] text-white flex items-center justify-center"
                    onClick={() => {}}
                  >
                    Download Video
                    <Download className="h-4 w-4" />
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="secondary"
                      className="flex-1 mr-2 bg-[#FD5C02] text-white"
                      onClick={() => handleReview(submission)}
                    >
                      Review
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1 bg-[#067647] hover:bg-green-700 text-white"
                      onClick={() => handleApproveClick(submission)}
                    >
                      Approve
                      <Check className="h-5 w-5 ml-1" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Render Creator View (similar to the image)
  const renderCreatorView = () => (
    <div className="space-y-6">
      {Object.entries(groupedSubmissions).map(([creatorName, creatorSubmissions]) => {
        const creatorSubmissionsTyped = creatorSubmissions as Submission[];
        // Count total and completed videos for each creator
        const totalCreatorVideos = creatorSubmissionsTyped.length;
        const completedCreatorVideos = creatorSubmissionsTyped.filter(
          (sub: { status: string; }) => sub.status === "approved"
        ).length;
        
        const sortedSubmissions = [...creatorSubmissionsTyped].sort((a, b) => {
          // Sort by video number
          const aVideoNum = parseInt(a.videoNumber.replace("#", ""));
          const bVideoNum = parseInt(b.videoNumber.replace("#", ""));
          return aVideoNum - bVideoNum;
        });

        return (
          <div key={creatorName} className="border border-gray-200 rounded-lg overflow-hidden">
            <div 
              className="flex justify-between items-center p-4 cursor-pointer"
              onClick={() => toggleCreatorExpand(creatorName)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
                  <Image
                    src={creatorSubmissionsTyped[0].creatorIcon}
                    alt={creatorName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    priority
                  />
                </div>
                <div>
                  <h3 className="text-lg font-medium">{creatorName}</h3>
                  <p className="text-sm text-start text-gray-600">
                    Total Videos: {completedCreatorVideos}/{totalCreatorVideos}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <p className="text-sm text-gray-600 mr-4">
                  Latest Update: {creatorSubmissionsTyped[0].submittedAt}
                </p>
                {expandedCreators[creatorName] ? (
                  <ChevronUp className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                )}
              </div>
            </div>
            
            {expandedCreators[creatorName] && (
              <div className="p-6 bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-6">
                {sortedSubmissions.map((submission) => {
                  const isNew = submission.status === "new";
                  const isApproved = submission.status === "approved";
                  const hasRevision = submission.revisionNumber !== "";

                  return (
                    <div key={submission.id} className={`border rounded-lg overflow-hidden ${isNew ? "border-purple-300" : "border-transparent"}`}>
                      <div className="p-4">
                        <div className="flex justify-between mb-1">
                          <div className="flex items-center">
                            <div className="text-orange-500 font-medium">
                              Video #{submission.videoNumber.replace("#", "")}
                            </div>
                          </div>
                            
                         
                        </div>
                        
                        <div className="flex gap-2 text-start items-center mb-2 text-sm">
						{hasRevision && (
                              <div className="text-orange-500 text-sm">
                                Revision #{submission.revisionNumber.replace("#", "")}
                              </div>
                            )}
							 {isNew && (
                            <Badge
                              variant="outline"
                              className="bg-orange-500 text-white rounded-full py-1 px-2"
                            >
                              <div className="flex items-center gap-1">
                                <span>New</span>
                                <Image
                                  src="/icons/star.svg"
                                  alt="Star"
                                  width={15}
                                  height={15}
                                />
                              </div>
                            </Badge>
                          )}
                          {isApproved ? (
                            <div>Approved: {submission.submittedAt}</div>
                          ) : (
                            <div>Submitted: {submission.submittedAt}</div>
                          )}
                        </div>

                        <div className="relative rounded-lg overflow-hidden mb-4">
                          <Image
                            src={submission.thumbnail}
                            alt={`Video ${submission.videoNumber} thumbnail`}
                            width={400}
                            height={225}
                            className="w-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-white bg-opacity-80 rounded-full w-16 h-16 flex items-center justify-center">
                              <div className="h-0 w-0 border-y-8 border-y-transparent border-l-12 border-l-orange-500 ml-1"></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex">
                          {isApproved ? (
                            <Button
                              variant="secondary"
                              className="flex-grow bg-[#FD5C02] text-white flex items-center justify-center"
                            >
                              Download Video
                              <Download className="h-4 w-4 ml-2" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="secondary"
                                className="flex-1 mr-2 bg-[#FD5C02] text-white"
                                onClick={() => handleReview(submission)}
                              >
                                Review
                              </Button>
                              <Button
                                variant="default"
                                className="flex-1 bg-[#067647] hover:bg-green-700 text-white"
                                onClick={() => handleApproveClick(submission)}
                              >
                                Approve
                                <Check className="h-5 w-5 ml-1" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl text-black font-bold">
          Project Submissions ({completedVideos})
        </h1>
        <div className="inline-flex rounded-full border border-orange-500 overflow-hidden">
          <Button
            variant="ghost"
            onClick={() => setActiveView("project")}
            className={`px-6 py-4 font-medium rounded-none ${
              activeView === "project"
                ? "bg-orange-500 text-white hover:bg-orange-500 rounded-full"
                : "bg-white text-black hover:bg-gray-50"
            }`}
          >
            Project View
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveView("creator")}
            className={`px-6 py-4 font-medium rounded-none ${
              activeView === "creator"
                ? "bg-orange-500 text-white hover:bg-orange-500 rounded-full"
                : "bg-white text-black hover:bg-gray-50"
            }`}
          >
            Creator View
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="w-[60%] mb-6">
          <div className="flex justify-between mb-2">
            <div className="text-sm font-normal text-black">
              Submission Progress
            </div>
            <div className="text-sm text-black">
              {completedVideos}/{totalVideos} videos (
              {Math.round(completionPercentage)}%)
            </div>
          </div>
          <div className="h-3 bg-[#FFD9C3] rounded-full w-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
        <div className="flex justify-end mb-4 space-x-2">
          <Select>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="new">New</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="creator">Creator Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeView === "project" ? renderProjectView() : renderCreatorView()}

      {/* Review Modal */}
      <ReviewVideoModal
        submission={currentSubmission}
        revisionsUsed={revisionUsed}
        maxRevisions={maxRevisions}
        onSubmit={handleSubmit}
        onClose={handleCloseModals}
        isOpen={openReviewDialog}
      />

      {/* Approval Modal */}
      <ProjectApprovalModal
        isOpen={openApproveDialog}
        onClose={handleCloseModals}
        onApprove={handleApprove}
      />
    </div>
  );
}
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Checkbox
} from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CheckIcon, ChevronDown, ChevronLeft, X } from "lucide-react";
import Image from "next/image";
import { Submission } from "./ProjectSubmissions";

interface ReviewVideoModalProps {
  submission: Submission | null;
  revisionsUsed: number;
  maxRevisions?: number;
  onSubmit: (approved: boolean, feedback?: string, issues?: string[]) => void;
  onClose: () => void;
  isOpen: boolean;
}

const ReviewVideoModal: React.FC<ReviewVideoModalProps> = ({
  submission,
  revisionsUsed = 1,
  maxRevisions = 3,
  onSubmit,
  onClose,
  isOpen,
}) => {
  const [feedback, setFeedback] = useState<string>("");
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  const issuesList = [
    "Wrong aspect ratio",
    "Off-brand messaging",
    "Low video quality",
    "Poor lighting",
    "Bad audio quality",
    "Missing key product features",
    "Incorrect pronunciation of brand name",
    "Lack of engagement or energy",
    "Unclear call-to-action",
    "Video too long or too short",
    "Poor framing or composition",
    "Distracting background or noise",
    "Incorrect use of brand assets",
    "Missing required hashtags or tags",
    "Inappropriate tone or language",
    "Off-topic content",
    "Overuse of filters or effects",
    "Competitor branding visible",
    "Music copyright issues",
    "Script deviation from brand guidelines",
    "Misrepresentation of the product",
    "Blurry or pixelated footage",
    "Lack of enthusiasm or authenticity",
    "Unapproved sponsorships or promotions"
  ];

  const toggleIssue = (issue: string) => {
    if (selectedIssues.includes(issue)) {
      setSelectedIssues(selectedIssues.filter(item => item !== issue));
    } else {
      setSelectedIssues([...selectedIssues, issue]);
    }
  };

  const removeIssue = (issue: string) => {
    setSelectedIssues(selectedIssues.filter(item => item !== issue));
  };

  const handleApprove = () => {
    onSubmit(true, feedback, selectedIssues);
    onClose();
  };

  const handleSendReview = () => {
    onSubmit(false, feedback, selectedIssues);
    onClose();
  };

  // Don't render if not open or no submission
  if (!isOpen || !submission) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <Card className="w-full max-w-3xl bg-white rounded-3xl overflow-hidden relative">
        {/* Back button - Positioned in the top left */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 inline-flex items-center text-gray-600 hover:text-black z-10"
        >
          <ChevronLeft className="h-5 w-5 mr-1" />
          <span>Back</span>
        </button>

        <CardHeader className="pb-0 pt-8">
          <h2 className="text-xl font-bold text-center text-black">
            Review Video
          </h2>
        </CardHeader>

        <CardContent className="p-6">
          <div className="flex flex-row gap-8">
            {/* Left side */}
            <div className="flex flex-col">
              <div className="flex items-start mb-6">
                <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden mr-2 ">
                  <Image
                    src={submission.creatorIcon}
                    alt="Creator avatar"
                    className="w-full h-full object-cover"
                    width={64}
                    height={64}
                  />
                </div>

                <div className="flex flex-col justify-start items-start">
                  <div className="flex items-center gap-2">
                    <div className="text-[#667085]">
                      Creator Name:{" "}
                      <span className="text-black font-medium">
                        {submission.creatorName}
                      </span>
                    </div>
                  </div>
                  <div className="text-[#667085]">
                    Submitted:{" "}
                    <span className="text-black">{submission.submittedAt}</span>
                  </div>
                  <div className="text-orange-500 font-medium">
                    Video {submission.videoNumber}
                  </div>
                </div>
              </div>

              <div className="relative rounded-lg overflow-hidden h-[350px] mb-6">
                <Image
                  src={submission.thumbnail}
                  alt="Video thumbnail"
                  className="w-full h-full"
                  width={200}
                  height={400}
                />
              </div>
            </div>

            {/* Right side */}
            <div className="w-1/2 pl-4">
              <div className="bg-[#FDEFE7] p-3 rounded-md mb-2">
                <p className="text-[#BE4501] text-sm text-start">
                  Please ensure all comments relate to the original brand
                  requirements and the video itself.
                </p>
              </div>

              <div className="mb-2">
                <p className="text-base text-black text-start font-medium mb-1">
                  Revision: {revisionsUsed}/{maxRevisions} used
                </p>
              </div>

              <div className="mb-2 relative">
                <p className="text-base text-black text-start font-medium mb-4">Select Your Issues</p>
                
                {/* Selected issues tags */}
                {selectedIssues.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedIssues.map((issue) => (
                      <div key={issue} className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm flex items-center">
                        {issue}
                        <button onClick={() => removeIssue(issue)} className="ml-1 text-gray-500 hover:text-gray-700">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Custom multi-select dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <span className="text-gray-500">{selectedIssues.length > 0 ? `${selectedIssues.length} issue(s) selected` : "Select Issues"}</span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>
                  
                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-56 overflow-y-auto">
                      {issuesList.map((issue) => (
                        <div 
                          key={issue}
                          className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleIssue(issue)}
                        >
                          <Checkbox 
                            checked={selectedIssues.includes(issue)}
                            onCheckedChange={() => toggleIssue(issue)}
                            className="mr-2 h-4 w-4"
                          />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-2">
                <p className="text-base text-black text-start font-medium mb-2">
                  Provide Detailed Feedback (Optional)
                </p>
                <Textarea
                  placeholder="Enter your text..."
                  className="resize-none min-h-[120px]"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
                <p className="text-sm text-start text-gray-500 mt-2">
                  (Max: 2000 characters)
                </p>
              </div>

              <div className="flex gap-4 mt-6">
                <Button
                  className="flex-1 bg-[#067647] hover:bg-green-700 text-white py-3 text-base"
                  onClick={handleApprove}
                >
                  Approve <CheckIcon className="h-5 w-5" />
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 text-base"
                  onClick={handleSendReview}
                >
                  Send Review
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewVideoModal;
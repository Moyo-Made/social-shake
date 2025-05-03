import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AffiliateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
}

export default function AffiliateLinkModal({
  isOpen,
  onClose,
  submissionId
}: AffiliateLinkModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [affiliateLink, setAffiliateLink] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const generateLink = async () => {
      if (isOpen && submissionId) {
        try {
          setIsLoading(true);
          setError("");
          
          const response = await fetch("/api/project-submissions/generate-affiliate-link", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ submissionId }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to generate affiliate link");
          }

          const data = await response.json();
          setAffiliateLink(data.data.tiktokLink);
        } catch (error) {
          console.error("Error generating affiliate link:", error);
          setError(error instanceof Error ? error.message : "Failed to generate affiliate link");
        } finally {
          setIsLoading(false);
        }
      }
    };

    generateLink();
  }, [isOpen, submissionId]);

  const copyToClipboard = () => {
    if (affiliateLink) {
      navigator.clipboard.writeText(affiliateLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} >
      <DialogContent className="sm:max-w-md md:max-w-xl h-[44%] bg-white rounded-lg font-satoshi">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">Affiliate Link</DialogTitle>
        </DialogHeader>
        
        <div className="text-center mb-8">
          <p className="text-gray-500">
            Add this link to the video caption or your bio. Each link is uniquely
            generated to track a specific video, so make sure to use the correct link for
            the corresponding video.
          </p>
          
          {isLoading ? (
            <div className="py-8 text-center">
              <p>Generating your affiliate link...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-red-500">{error}</p>
              <Button 
                onClick={onClose} 
                className="mt-4 bg-gray-200 text-black"
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-6 mb-8 bg-orange-50 p-4 rounded-md border border-orange-200 overflow-hidden">
                <Link href={affiliateLink} className="text-orange-500 break-all hover:underline">{affiliateLink}</Link>
              </div>
              
              <Button
                onClick={copyToClipboard}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-base py-5"
              >
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
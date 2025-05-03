"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { CreatorSubmission } from "@/types/submission";
import toast from "react-hot-toast";

interface VerifyTikTokLinkModalProps {
	isOpen: boolean;
	onClose: () => void;
	onVerify: () => void;
	onRequestNewLink: () => void;
	submission?: CreatorSubmission | null;
}

const VerifyTikTokLinkModal: React.FC<VerifyTikTokLinkModalProps> = ({
	isOpen,
	onClose,
	onVerify,
	onRequestNewLink,
	submission
}) => {
	if (!isOpen) return null;

	const handleCopyLink = () => {
		if (submission?.tiktokLink) {
			navigator.clipboard.writeText(submission.tiktokLink);
			toast.success("TikTok link copied to clipboard");
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
			<div className="bg-white rounded-lg py-6 px-8 mx-4">
				<h3 className="text-start text-black text-xl font-medium mb-4">
					Verify TikTok Link
				</h3>
				<p className="text-start text-[#667085] mb-2">
					To verify the TikTok Link:
				</p>
				<ul className="list-disc text-start space-y-1 mb-4 ml-5">
					<li>
						{submission?.tiktokLink ? (
							<div className="flex items-center">
								<Link 
									href={submission.tiktokLink} 
									target="_blank" 
									className="text-orange-500 hover:underline"
								>
									Open TikTok Link
								</Link>
								<Button
									variant="ghost"
									size="sm"
									className="h-8 w-8 p-0 ml-2"
									onClick={handleCopyLink}
								>
									<Copy className="h-4 w-4" />
								</Button>
							</div>
						) : (
							<span className="text-red-500">No TikTok link available</span>
						)}
					</li>
					<li>Verify if it&apos;s the right content and correctly posted</li>
				</ul>
				<div className="flex justify-start space-x-3">
					<Button variant="outline" onClick={onClose} className="bg-white">
						Cancel
					</Button>
					<Button
						onClick={onVerify}
						className="bg-[#067647] text-white"
					>
						TikTok Link Verified <Check className="h-4 w-4" />
					</Button>
					<Button
						onClick={onRequestNewLink}
						className="bg-orange-500 hover:bg-orange-600 text-white"
					>
						Request New Link
					</Button>
				</div>
			</div>
		</div>
	);
};

export default VerifyTikTokLinkModal;
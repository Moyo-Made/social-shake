"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface VerifyTikTokLinkModalProps {
	isOpen: boolean;
	onClose: () => void;
	onVerify: () => void;
	onRequestNewLink: () => void;
}

const VerifyTikTokLinkModal: React.FC<VerifyTikTokLinkModalProps> = ({
	isOpen,
	onClose,
	onVerify,
	onRequestNewLink,
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
			<div className="bg-white rounded-lg py-6 px-8 mx-4">
				<h3 className="text-start text-black text-xl font-medium mb-4">
				Verify Tiktok Link
				</h3>
				<p className="text-start text-[#667085] mb-2">
				To verify the Tiktok Link:-
				</p>
				<ul className="list-disc text-start space-y-1 mb-4 ml-5">
					<li>Click here to copy the <a href="https://www.tiktok.com/@creator_4wp0zb" target="_blank" className="text-orange-500 hover:underline">Tiktok Link</a>.</li>
					<li>Paste in your Browser and verify if its the right Link</li>
		
				</ul>
				<div className="flex justify-start space-x-3">
					<Button variant="outline" onClick={onClose} className="bg-white">
						Cancel
					</Button>
					<Button
						onClick={onVerify}
						className="bg-[#067647] text-white"
					>
						Tiktok Link Verified <Check className="h-4 w-4" />
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

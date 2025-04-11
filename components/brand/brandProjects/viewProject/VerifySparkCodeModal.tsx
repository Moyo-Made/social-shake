"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface VerifySparkCodeModalProps {
	isOpen: boolean;
	onClose: () => void;
	onVerify: () => void;
	onRequestNewCode: () => void;
}

const VerifySparkCodeModal: React.FC<VerifySparkCodeModalProps> = ({
	isOpen,
	onClose,
	onVerify,
	onRequestNewCode,
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
			<div className="bg-white rounded-lg py-6 px-8 mx-4">
				<h3 className="text-start text-black text-xl font-medium mb-4">
					Verify Spark Code
				</h3>
				<p className="text-start text-[#667085] mb-2">
					To verify the Spark Code, follow these steps:
				</p>
				<ul className="list-disc text-start space-y-1 mb-4 ml-5">
					<li>Log in to TikTok Ads Manager.</li>
					<li>Navigate to the &quot;Authorize Post&quot; section.</li>
					<li>Enter the Spark Code provided.</li>
					<li>Ensure the post is linked correctly and authorized for ads.</li>
				</ul>
				<div className="flex justify-start space-x-3">
					<Button variant="outline" onClick={onClose} className="bg-white">
						Cancel
					</Button>
					<Button
						onClick={onVerify}
						className="bg-[#067647] text-white"
					>
						Spark Code Verified <Check className="h-4 w-4" />
					</Button>
					<Button
						onClick={onRequestNewCode}
						className="bg-orange-500 hover:bg-orange-600 text-white"
					>
						Request New Code
					</Button>
				</div>
			</div>
		</div>
	);
};

export default VerifySparkCodeModal;

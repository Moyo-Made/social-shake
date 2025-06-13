"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmActorModalProps {
	isOpen: boolean;
	onConfirm: () => void;
	onBack: () => void;
	onClose: () => void;
}

export default function ConfirmActorModal({
	isOpen,
	onConfirm,
	onBack,
	onClose,
}: ConfirmActorModalProps) {
	const [isConfirmed, setIsConfirmed] = useState(false);

	if (!isOpen) return null;

	const handleConfirm = () => {
		if (isConfirmed) {
			onConfirm();
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-3xl max-w-2xl w-full p-8 relative">
				{/* Close Button */}
				<button
					onClick={onClose}
					className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
				>
					<X size={24} />
				</button>

				{/* Header */}
				<div className="mb-5">
					<h2 className="text-xl font-semibold text-gray-900 mb-1">
						Confirm Actor Generation
					</h2>
					<p className="text-gray-600">
						Please ensure you have the right to use this image
					</p>
				</div>

				{/* Consent Box */}
				<div
					className="border border-[#D0D5DD] rounded-md p-4 mb-4 text-sm"
				>
					<p className="text-gray-700 mb-2">
						By continuing, you confirm that the image you are uploading is of
						yourself, and you give full consent for it to be used in generating
						AI avatars and related video content.
					</p>
					<p className="text-gray-700">
						Uploading images of others without their consent is strictly
						prohibited. Social Shake may suspend accounts or take action against
						misuse.
					</p>
				</div>

				{/* Confirmation Checkbox */}
				<div className="mb-8">
					<label className="flex items-center gap-3 cursor-pointer group">
						<div
							className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
								isConfirmed
									? "bg-orange-500 border-orange-500 shadow-sm"
									: "border-gray-300 group-hover:border-orange-300"
							}`}
							onClick={() => setIsConfirmed(!isConfirmed)}
						>
							{isConfirmed && <Check size={12} className="text-white" />}
						</div>
						<span className="text-gray-800">
							I confirm and consent to the above terms
						</span>
					</label>
				</div>

				{/* Action Buttons */}
				<div className="flex justify-end gap-4">
					<Button
						onClick={onBack}
						className="px-8 py-3 text-gray-600 border border-gray-300 rounded-md shadow-none font-medium transition-all duration-200"
					>
						Back
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={!isConfirmed}
						className={`px-8 py-3 rounded-md shadow-none transition-all duration-200 ${
							isConfirmed
								? "bg-orange-500 text-white hover:bg-orange-600 shadow-none transform "
								: "bg-gray-300 text-gray-500 cursor-not-allowed"
						}`}
					>
						Turn into AI Actor
					</Button>
				</div>
			</div>
		</div>
	);
}

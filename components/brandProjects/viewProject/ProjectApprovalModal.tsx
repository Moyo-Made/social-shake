"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface ProjectApprovalModalProps {
	isOpen: boolean;
	onClose: () => void;
	onApprove: () => void;
}

const ProjectApprovalModal: React.FC<ProjectApprovalModalProps> = ({
	isOpen,
	onClose,
	onApprove,
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
			<div className="bg-white rounded-lg p-6 max-w-lg mx-4">
				<h3 className="text-start text-black text-lg font-medium mb-4">Confirm Approval</h3>
				<p className="text-start text-[#667085] mb-6">
					Are you sure you want to approve this Video? Once approved, no further
					revisions can be requested.
				</p>
				<div className="flex justify-end space-x-3">
					<Button variant="outline" onClick={onClose} className="bg-white">
						Cancel
					</Button>
					<Button
						onClick={onApprove}
						className="bg-orange-500 hover:bg-orange-600 text-white"
					>
						Approve <Check className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
};

export default ProjectApprovalModal;

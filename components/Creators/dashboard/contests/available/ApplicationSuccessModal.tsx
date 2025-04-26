"use client";

import { CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ApplicationSuccessModalProps {
	isOpen: boolean;
	onClose: () => void;
	message?: string;
}

const ApplicationSuccessModal: React.FC<ApplicationSuccessModalProps> = ({
	isOpen,
	onClose,
	message = "Your application has been submitted for review. You’ll receive a notification once the brand reviews your entry.",
}) => {
	const router = useRouter();

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
			<div className="bg-white rounded-lg w-full max-w-xl shadow-lg p-6 flex flex-col justify-center items-center">
				<div className="flex justify-center mb-4">
					<div className="bg-orange-100 p-3 rounded-full">
						<CheckCircle size={48} className="text-orange-500" />
					</div>
				</div>
				<div className="flex items-center gap-1 mb-1">
					<span role="img" aria-label="celebration" className="text-3xl">
						🎉
					</span>
					<h2 className="text-2xl font-bold mb-2">
						Application Submitted Successfully!
					</h2>
				</div>

				<p className="text-gray-600 text-center mb-6">{message}</p>

				<button
					onClick={() => {
						router.push("/creator/dashboard/contest/applied");
						onClose();
					}}
					className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md transition-colors mb-3"
				>
					Go to My Contests
				</button>

				<button
					onClick={() => {
						router.push("/creator/dashboard/contest/all");
						onClose();
					}}
					className="w-full bg-transparent font-medium"
				>
					&larr; Available Contests
				</button>
			</div>
		</div>
	);
};

export default ApplicationSuccessModal;

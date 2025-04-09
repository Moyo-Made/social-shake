"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface TicketConfirmationProps {
	ticketId: string;
	onSubmitAnother: () => void;
}

export default function TicketConfirmation({
	ticketId,
	onSubmitAnother,
}: TicketConfirmationProps) {
	const router = useRouter();

	return (
		<div className="text-center py-12">
			<div className="flex items-center justify-center mx-auto mb-4">
				<Image
					src="/icons/check-circle.svg"
					alt="Success"
					width={80}
					height={80}
				/>
			</div>

			<h2 className="text-2xl font-bold mb-2">Support Ticket Submitted</h2>
			<p className="mb-1">Your ticket has been submitted successfully.</p>
			<p className="text-gray-700 mb-6">
				Ticket ID: <span className="font-semibold">#{ticketId}</span>
			</p>

			<p className="mb-8">
				You will receive an email confirmation shortly. Our team will respond
				within 24 hours
			</p>

			<div className="flex justify-center space-x-4">
				<Button className="border border-[#6670854D] text-[#667085] shadow-none" onClick={onSubmitAnother}>
					Submit Another Request
				</Button>

				<Button
					className="bg-orange-500 hover:bg-orange-600 text-white shadow-none"
					onClick={() => router.push("/dashboard/help-support/history")}
				>
					View My Tickets
				</Button>
			</div>
		</div>
	);
}

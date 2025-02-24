"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

import Image from "next/image";
import Basic from "./Basic";
import Requirements from "./Requirements";

export default function ContestForm() {
	const [step, setStep] = useState(1);

	return (
		<div className="max-w-[44rem] mx-auto">
			<nav className="flex pb-5">
				{["Basics", "Requirements", "Prizes & Timeline", "Review"].map(
					(tab, index) => (
						<div key={index} className="flex-1 relative">
							<button
								className={`w-full p-3 text-center ${
									step === index + 1 ? "text-orange-500" : "text-gray-500"
								}`}
								onClick={() => setStep(index + 1)}
							>
								<div className="flex items-center justify-center gap-2">
									<Image
										src={
											step === index + 1
												? "/icons/orange-check.svg"
												: "/icons/gray-check.svg"
										}
										alt="Check"
										width={25}
										height={25}
									/>
									<span>{tab}</span>
								</div>
							</button>
							{step === index + 1 && (
								<>
									<div className="absolute bottom-0 left-2 w-full h-[3px] bg-[#FD5C02] rounded-full"></div>
								</>
							)}
						</div>
					)
				)}
			</nav>
			<div className="max-w-[44rem] mx-auto p-6 pt-3 bg-white shadow-md rounded-lg">
				<div className="p-4">
					{step === 1 && <Basic />}

					{step === 2 && <Requirements />}
					{step === 3 && <p className="text-gray-500">Heree</p>}
				</div>
			</div>
			<div className="flex justify-between">
				<Button onClick={() => {}} className="mt-4 bg-gray-500 hover:bg-gray-600 px-4 py-2 text-white text-base">
					Save Draft
				</Button>
				<Button onClick={() => setStep(2)} className="mt-4 bg-[#FD5C02] hover:bg-orange-600 text-white text-base py-5 font-normal">
					Next →
				</Button>
			</div>
		</div>
	);
}

"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import Image from "next/image";

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
			<div className="max-w-[44rem] mx-auto p-6 pt-8 bg-white shadow-md rounded-lg">
				<div className="p-4">
					{step === 1 && (
						<div>
							<label className="block text-sm font-medium text-gray-700">
								Contest Name
							</label>
							<Input
								className="mt-1"
								placeholder="Best TikTok Ad for XYZ Shoes"
							/>

							<label className="block text-sm font-medium text-gray-700 mt-4">
								Contest Industry
							</label>
							<Select>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select Industry" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="fashion">Fashion</SelectItem>
									<SelectItem value="technology">Technology</SelectItem>
									<SelectItem value="food">Food</SelectItem>
								</SelectContent>
							</Select>

							<label className="block text-sm font-medium text-gray-700 mt-4">
								Contest Description
							</label>
							<Textarea
								className="mt-1"
								rows={3}
								placeholder="We’re looking for an energetic and engaging TikTok ad for XYZ Shoes. Highlight comfort and style, and encourage users to try them out!"
							/>

							<label className="block text-sm font-medium text-gray-700 mt-4">
								Contest Rules
							</label>
							<Textarea
								className="mt-1"
								rows={5}
								placeholder="• Content must meet all brand guidelines (duration, aspect ratio, tone).&#10;• Only original content will be accepted—no copyrighted material."
							/>
							<ul className="list-disc pl-5 text-sm text-gray-600">
								<li>
									Content must meet all brand guidelines (duration, aspect
									ratio, tone).
								</li>
								<li>
									Only original content will be accepted—no copyrighted
									material.
								</li>
								<li>
									Winners will be determined based on leaderboard rankings
									(views/likes).
								</li>
								<li>
									The brand reserves the right to request revisions or
									disqualify incomplete entries.
								</li>
							</ul>

							<label className="block text-sm font-medium text-gray-700 mt-4">
								Contest Thumbnail
							</label>
							<div className="border-dashed border-2 p-4 text-center text-sm text-gray-500 rounded mt-1 cursor-pointer">
								Click to upload or drag and drop (PNG, JPG max 800x400px)
							</div>

							<Button onClick={() => setStep(2)} className="mt-4">
								Next
							</Button>
						</div>
					)}

					{step !== 1 && <p className="text-gray-500">Coming soon...</p>}
				</div>
			</div>
		</div>
	);
}

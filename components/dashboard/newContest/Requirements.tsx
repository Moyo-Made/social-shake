"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import React, { useState } from "react";

const Requirements = () => {
	const [selected, setSelected] = useState("");
	return (
		<div className="flex flex-col space-y-5">
			<div className="flex flex-col">
				<Label className="text-base">Who Can Join Your Contest ?</Label>
				<span className="text-sm text-[#1A1A1A] mt-1 italic">
					(Choose whether creators need to apply for approval or if all creators
					are pre-approved to participate.)
				</span>

				<RadioGroup
					className="flex flex-wrap gap-3 mt-2"
					value={selected}
					onValueChange={setSelected}
				>
					<div
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={
							selected === "allow-applications" ? "checked" : "unchecked"
						}
					>
						<RadioGroupItem
							value="allow-applications"
							id="allow-applications"
							className=""
						/>
						<Label htmlFor="allow-applications">Allow Applications</Label>
					</div>

					<div
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border border-[#667085] px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={
							selected === "allow-all-creators" ? "checked" : "unchecked"
						}
					>
						<RadioGroupItem
							value="allow-all-creators"
							id="allow-all-creators"
							className=""
						/>
						<Label htmlFor="allow-all-creators">Allow All Creators</Label>
					</div>
				</RadioGroup>
			</div>

			<div>
				<Label className="text-base">Duration ?</Label>
				<RadioGroup
					className="flex flex-wrap gap-3 mt-2"
					value={selected}
					onValueChange={setSelected}
				>
					<div
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={selected === "15-seconds" ? "checked" : "unchecked"}
					>
						<RadioGroupItem value="15-seconds" id="15-seconds" className="" />
						<Label htmlFor="15-seconds">15 Seconds</Label>
					</div>

					<div
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={selected === "30-seconds" ? "checked" : "unchecked"}
					>
						<RadioGroupItem value="30-seconds" id="30-seconds" className="" />
						<Label htmlFor="30-seconds">30 Seconds</Label>
					</div>

					<div
						className="flex items-center space-x-2 cursor-pointer text-[#667085] border-[#667085] border px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
						data-state={selected === "60-seconds" ? "checked" : "unchecked"}
					>
						<RadioGroupItem value="60-seconds" id="60-seconds" className="" />
						<Label htmlFor="60-seconds">60 Seconds</Label>
					</div>
				</RadioGroup>
			</div>

			<div className="flex flex-col">
				<Label className="text-base">Video Type ?</Label>
				<span className="text-sm text-[#1A1A1A] mt-1 italic">
					(Choose whether creators should follow your script or create their
					own)
				</span>

				<RadioGroup
					className="flex flex-wrap gap-3 mt-2"
					value={selected}
					onValueChange={setSelected}
				>
					<div
						className="flex items-center space-x-2 cursor-pointer text-[#000]"
						data-state={selected === "client-script" ? "checked" : "unchecked"}
					>
						<RadioGroupItem
							value="client-script"
							id="client-script"
							className="data-[state=checked]:bg-[#FD5C02] border border-gray-100 text-white"
						/>
						<Label htmlFor="client-script" className="text-[#1A1A1A]">Client&#39;s Script</Label>
					</div>

					<div
						className="flex items-center space-x-2 cursor-pointer"
						data-state={selected === "creator-script" ? "checked" : "unchecked"}
					>
						<RadioGroupItem
							value="creator-script"
							id="creator-script"
							className="data-[state=checked]:bg-[#FD5C02] border border-gray-100 text-white"
						/>
						<Label htmlFor="creator-script" className="text-[#1A1A1A]">Creator&#39;s Script</Label>
					</div>
				</RadioGroup>
			</div>
		</div>
	);
};

export default Requirements;

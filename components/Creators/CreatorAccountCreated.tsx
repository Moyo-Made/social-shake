import React from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import Image from "next/image";
import { Button } from "../ui/button";
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa6";

const CreatorAccountCreated = () => {
	return (
		<main className="relative min-h-[90vh] overflow-y-auto ">
			<div className="absolute inset-0">
				<Image
					src="/images/social-shake-bg.png"
					alt="Background Image"
					className="w-full h-full object-cover"
					fill
					
				/>
			</div>

			{/* Dark Overlay */}
			<div className="absolute inset-0 bg-black/50" />

			{/* Account Created Card */}
			<div className="relative flex items-center justify-center px-4 py-16 xl:py-24 font-satoshi">
				<Card className="w-full max-w-xl bg-white border-2 border-[#FFBF9B] backdrop-blur-sm px-[2px] py-[6px] md:px-[30px] md:py-[10px] lg:px-[50px] lg:py-[20px]">
					<CardHeader className="space-y-2 items-center text-center">
						<Image src="/icons/check.svg" alt="Check" width={80} height={80} />
						<h1 className="text-xl md:text-2xl lg:text-3xl text-gray-900 font-semibold lg:leading-10">
							Account Created Successfully!
						</h1>
						<p className="w-full mb-5 text-sm md:text-base text-gray-600 font-normal">
						You&apos;re almost there! Provide a few details to help us verify your identity and connect you with top brands.
						</p>
					</CardHeader>
					<CardContent>
						{/* Submit Button */}
						<Button className="w-full bg-[#FD5C02] hover:bg-orange-600 text-white text-[17px] py-5 font-normal">
							<Link href="/creator/verify-identity" className="flex">
								<p>Complete Verification</p>{" "}
								<FaArrowRight className="w-5 h-5 ml-2 mt-1.5" />
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		</main>
	);
};

export default CreatorAccountCreated;

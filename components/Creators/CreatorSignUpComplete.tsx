import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa6";
import DashboardPage from "@/app/brand/dashboard/page";
import { Clock } from "lucide-react";

const SignUpComplete = () => {
	return (
		<main className="flex flex-col relative min-h-screen overflow-y-scroll">
			<div className="fixed inset-0 h-full w-full">
				<DashboardPage />
			</div>

			{/* Dark Overlay */}
			<div className="fixed inset-0 w-full h-full bg-black/50" />

			{/* Account Created Card */}
			<div className="relative flex items-center justify-center px-4 py-16 xl:py-24 font-satoshi">
				<Card className="w-full max-w-lg bg-white backdrop-blur-sm px-[2px] py-[6px] md:px-[30px] md:py-[10px] lg:px-[50px] lg:py-[20px]">
					<CardHeader className="space-y-2 items-center text-center">
						<Clock className="w-16 h-16 text-orange-500" />
						<h1 className="text-xl md:text-2xl lg:text-3xl text-gray-900 font-semibold lg:leading-10">
							Verification in Progress
						</h1>
						<p className="w-full mb-5 text-sm md:text-base text-gray-600 font-normal">
							Thank you for submitting your details. Our team will review your
							information and get back to you within 48 Hours. Stay tuned!
						</p>
					</CardHeader>
					<CardContent>
						{/* Submit Button */}
						<Button className="w-full bg-[#FD5C02] hover:bg-orange-600 text-white text-[17px] py-5 font-normal">
							<Link href="/creator/dashboard" className="flex">
								<p>Explore Dashboard</p>{" "}
								<FaArrowRight className="w-5 h-5 ml-2 mt-1.5" />
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		</main>
	);
};

export default SignUpComplete;

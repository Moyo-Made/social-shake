import React from "react";
import SideNavLayout from "./SideNav";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { FaArrowRight } from "react-icons/fa6";

const PaymentSuccessful = () => {
	return (
		<SideNavLayout>

			{/* Dark Overlay */}
			<div className="absolute inset-0 bg-black/50" />
			
			{/* Payment Successful Card */}
			<div className="relative flex items-center justify-center px-4 py-16 xl:py-24 font-satoshi">
				<Card className="w-full max-w-md bg-white border border-[#FFBF9B] backdrop-blur-sm px-[2px] py-[6px] md:px-[30px] md:py-[10px]">
					<CardHeader className="space-y-2 items-center text-center">
						<Image
							src="/icons/orange-check.svg"
							alt="Check"
							width={80}
							height={80}
						/>
						<h1 className="text-xl md:text-2xl lg:text-3xl text-gray-900 font-semibold lg:leading-10">
							Contest Payment Confirmed
						</h1>
						<p className="w-full mb-5 text-sm md:text-base text-gray-600 font-normal">
							Your Contest is live and will start receiving applications
						</p>
					</CardHeader>
					<CardContent>
						{/* Submit Button */}
						<Button className="flex justify-center items-center bg-[#FD5C02] hover:bg-orange-600 text-white text-[17px] py-5 font-normal mx-auto">
							<Link href="/dashboard/contests" className="flex">
								<p>View Contest</p>{" "}
								<FaArrowRight className="w-5 h-5 ml-2 mt-1.5" />
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		</SideNavLayout>
	);
};

export default PaymentSuccessful;

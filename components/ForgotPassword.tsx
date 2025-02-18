import React from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import Link from "next/link";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

const ForgotPassword = () => {
	return (
		<main className="relative overflow-hidden min-h-screen">
			<div className="absolute inset-0">
				<img
					src="/images/social-shake-bg.png"
					alt="Background Image"
					className="w-full h-full object-cover"
				/>
			</div>

			{/* Dark Overlay */}
			<div className="absolute inset-0 bg-black/50" />

			{/* Forgot Password Card */}
			<div className="relative flex items-center justify-center px-4 py-16 xl:py-24 font-satoshi">
				<Card className="w-full max-w-xl bg-white backdrop-blur-sm px-[2px] py-[6px] md:px-[30px] md:py-[10px] lg:px-[50px] lg:py-[20px]">
					<CardHeader className="space-y-2 items-center text-center">
						<h1 className="text-xl md:text-2xl lg:text-3xl text-gray-900 font-semibold lg:leading-10">
							Forgot Password?
						</h1>
						<p className="w-full mb-5 text-sm md:text-base text-gray-600 font-normal">
							No worries, we’ll send you reset instructions.
						</p>
					</CardHeader>
					<CardContent className="space-y-4 md:space-y-5">
						{/* Email Field */}
						<div className="space-y-1">
							<Label htmlFor="email" className="text-sm md:text-lg font-medium">
								Email
							</Label>
							<Input
								id="email"
								type="email"
								placeholder="Enter your business email"
								className="w-full placeholder:text-sm md:placeholder:text-base md:py-5"
							/>
						</div>

						{/* Submit Button */}
						<Button className="w-full bg-[#FD5C02] hover:bg-orange-600 text-white text-[17px] py-5 font-normal">
							Reset Password <FaArrowRight className="w-5 h-5 ml-2 mt-1" />
						</Button>

						<div className="flex justify-center items-center space-x-2">
							<FaArrowLeft className="w-5 h-5 ml-2" />
							<Link href="/login">
								<p className="text-base font-semibold">Back to login</p>
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		</main>
	);
};

export default ForgotPassword;

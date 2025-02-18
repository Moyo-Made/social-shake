import React from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import Image from "next/image";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { FaArrowRight } from "react-icons/fa6";
import { Label } from "./ui/label";
import Link from "next/link";

const Login = () => {
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

			{/* Login Card */}
			<div className="relative flex items-center justify-center px-4 py-6 xl:py-12 font-satoshi">
				<Card className="w-full max-w-xl bg-white backdrop-blur-sm px-[2px] py-[6px] md:px-[30px] md:py-[10px] lg:px-[50px] lg:py-[20px]">
					<CardHeader className="space-y-3 items-center text-center">
						<div className="w-32 h-8 mb-8">
							<Image
								src="/images/logo.png"
								alt="Social Shake logo"
								width={110}
								height={110}
							/>
						</div>
						<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold lg:leading-10">
							Welcome Back
						</h1>
						<p className="w-full mb-5 text-sm md:text-base text-[#000] font-normal">
							Log in to connect with creators and track your brand's success.
						</p>
					</CardHeader>

					<CardContent className="space-y-3 md:space-y-4">
						{/* Email Field */}
						<div className="space-y-1">
							<Label htmlFor="email" className="text-sm md:text-lg font-medium">
								Email*
							</Label>
							<Input
								id="email"
								type="email"
								placeholder="Enter your business email"
								className="w-full placeholder:text-sm md:placeholder:text-base md:py-5"
							/>
						</div>

						{/* Password Field */}
						<div className="space-y-1 pb-3 md:pb-5 ">
							<Label
								htmlFor="password"
								className="text-sm md:text-lg font-medium"
							>
								Password*
							</Label>
							<Input
								id="password"
								type="password"
								placeholder="Create a password"
								className="w-full placeholder:text-sm md:placeholder:text-base md:py-5"
							/>
							<p className="text-gray-600 text-sm md:text-base font-normal pt-px">
								Must be at least 8 characters.
							</p>
						</div>

						{/* Submit Button */}
						<Button className="w-full bg-[#FD5C02] hover:bg-orange-600 text-white text-[17px] py-5 font-normal">
							Create Account <FaArrowRight className="w-5 h-5 ml-2 mt-1" />
						</Button>

						<Link
							href="/forgot-password"
							className="flex justify-center items-center text-sm md:text-base text-[#000] hover:underline"
						>
							<p className=" pt-1">Forgot Password?</p>
						</Link>
					</CardContent>
				</Card>
			</div>
		</main>
	);
};

export default Login;

import Link from "next/link";
import React from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import Image from "next/image";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { FaArrowRight } from "react-icons/fa6";
import { FaArrowLeft } from "react-icons/fa6";
import { Button } from "./ui/button";

const CreateAccount = () => {
	return (
		<main className="relative min-h-screen overflow-y-auto ">
			<div className="absolute inset-0">
				<img
					src="/images/social-shake-bg.png"
					alt="Background Image"
					className="w-full h-full object-cover"
				/>
			</div>

			{/* Dark Overlay */}
			<div className="absolute inset-0 bg-black/50" />

			{/* Signup Card */}
			<div className="relative flex items-center justify-center px-4 py-6 xl:py-12 font-satoshi">
				<Card className="w-full max-w-xl bg-white backdrop-blur-sm px-[2px] py-[6px] md:px-[30px] md:py-[10px] lg:px-[50px] lg:py-[20px]">
					<Link href="/signup">
						<FaArrowLeft className="w-5 h-5 absolute left-8 md:left-6 top-12 md:top-10" />
					</Link>
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
							Join Social Shake and Connect with Top Creators!
						</h1>
						<p className="mb-5 text-sm md:text-base text-[#000] font-normal">
							Sign up to launch contests, collaborate with creators, and grow
							your brand with user-generated content.
						</p>
						<div className="flex space-x-1">
							<p className="text-gray-600 font-medium text-sm md:text-base">
								Already have an account?
							</p>
							<Link
								href="/login"
								className="text-[#FD5C02] hover:underline font-medium text-sm md:text-base"
							>
								Log in
							</Link>
						</div>
					</CardHeader>

					<CardContent className="space-y-3 md:space-y-4">
						{/* Name Fields Row */}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1">
								<Label
									htmlFor="firstName"
									className="text-sm md:text-lg font-medium"
								>
									First Name*
								</Label>
								<Input
									id="firstName"
									placeholder="Enter your first name"
									className="w-full placeholder:text-sm md:placeholder:text-base md:py-5"
								/>
							</div>
							<div className="space-y-1">
								<Label
									htmlFor="lastName"
									className="text-sm md:text-lg font-medium "
								>
									Last Name*
								</Label>
								<Input
									id="lastName"
									placeholder="Enter your last name"
									className="w-full placeholder:text-sm md:placeholder:text-base md:py-5"
								/>
							</div>
						</div>

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
							<Link href="/account-successfully-created" className="flex">
								<p>Create Account</p>{" "}
								<FaArrowRight className="w-5 h-5 ml-2 mt-1" />
							</Link>
						</Button>

						<p className="text-sm md:text-base text-center text-[#000] pt-2">
							By signing up, you confirm that you have read and agree to our{" "}
							<Link href="#" className="text-[#FD5C02] underline">
								Privacy Policy
							</Link>{" "}
							and{" "}
							<Link href="#" className="text-[#FD5C02] underline">
								Terms of Use
							</Link>
						</p>
					</CardContent>
				</Card>
			</div>
		</main>
	);
};

export default CreateAccount;

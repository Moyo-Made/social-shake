"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import Image from "next/image";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { FaArrowRight, FaArrowLeft } from "react-icons/fa6";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

// Define interface for form data
interface SignupFormData {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
}

const CreateAccount = () => {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [formData, setFormData] = useState<SignupFormData>({
		firstName: "",
		lastName: "",
		email: "",
		password: "",
	});

	// Handle input change
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({
			...formData,
			[e.target.id]: e.target.value,
		});
	};
	
	// const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
	// 	e.preventDefault();
	// 	setIsLoading(true);
	// 	setError(null);
	
	// 	// Validate form data
	// 	if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
	// 		setError("All fields are required");
	// 		setIsLoading(false);
	// 		return;
	// 	}
	
	// 	try {
	// 		const result = await signIn("credentials", {
	// 			email: formData.email,
	// 			password: formData.password,
	// 			firstName: formData.firstName,
	// 			lastName: formData.lastName,
	// 			isSignUp: "true",
	// 			redirect: false,
	// 			callbackUrl: "/dashboard"
	// 		});
	
	// 		console.log("SignIn result:", result);
	
	// 		if (result?.error) {
	// 			setError(result.error);
	// 			return;
	// 		}
	
	// 		if (result?.ok) {
	// 			router.push("/dashboard");
	// 		}
	// 	} catch (error: any) {
	// 		console.error("Signup error:", error);
	// 		setError(error.message || "Failed to create account");
	// 	} finally {
	// 		setIsLoading(false);
	// 	}
	// };

	return (
		<main className="relative min-h-screen overflow-y-auto">
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
				<Card className="w-full max-w-xl bg-white border-2 border-[#FFBF9B] backdrop-blur-sm px-[2px] py-[6px] md:px-[30px] md:py-[5px] lg:px-[50px] lg:py-[5px]">
					<Link href="/signup">
						<FaArrowLeft className="w-5 h-5 absolute left-8 md:left-6 top-12 md:top-10" />
					</Link>
					<CardHeader className="space-y-3 items-center text-center">
						<div className="w-32 h-8 mb-8">
							<Image
								src="/images/logo.svg"
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
						<form>
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
										type="text"
										value={formData.firstName}
										onChange={handleChange}
										placeholder="Enter your first name"
										className="w-full placeholder:text-sm md:placeholder:text-base md:py-5"
									/>
								</div>
								<div className="space-y-1">
									<Label
										htmlFor="lastName"
										className="text-sm md:text-lg font-medium"
									>
										Last Name*
									</Label>
									<Input
										id="lastName"
										type="text"
										value={formData.lastName}
										onChange={handleChange}
										placeholder="Enter your last name"
										className="w-full placeholder:text-sm md:placeholder:text-base md:py-5"
									/>
								</div>
							</div>

							{/* Email Field */}
							<div className="space-y-1 mt-3 md:mt-4">
								<Label
									htmlFor="email"
									className="text-sm md:text-lg font-medium"
								>
									Email*
								</Label>
								<Input
									id="email"
									type="email"
									value={formData.email}
									onChange={handleChange}
									placeholder="Enter your business email"
									className="w-full placeholder:text-sm md:placeholder:text-base md:py-5"
								/>
							</div>

							{/* Password Field */}
							<div className="space-y-1 pb-3 md:pb-5 mt-3 md:mt-4">
								<Label
									htmlFor="password"
									className="text-sm md:text-lg font-medium"
								>
									Password*
								</Label>
								<Input
									id="password"
									type="password"
									value={formData.password}
									onChange={handleChange}
									placeholder="Create a password"
									className="w-full placeholder:text-sm md:placeholder:text-base md:py-5"
									minLength={8}
								/>
								<p className="text-gray-600 text-sm md:text-base font-normal pt-px">
									Must be at least 8 characters.
								</p>
							</div>

							{/* Submit Button */}
							<Link href="/account-successfully-created">
							
							<Button
								type="submit"
								disabled={isLoading}
								className={`w-full bg-[#FD5C02] hover:bg-orange-600 text-white text-[17px] py-5 font-normal ${
									isLoading ? "opacity-50 cursor-not-allowed" : ""
								}`}
							>
								
								<span>
									{isLoading ? "Creating Account..." : "Create Account"}
								</span>{" "}
								<FaArrowRight className="w-5 h-5 ml-2 mt-1" />
							</Button>
							</Link>

							{/* {success && (
								<div className="mt-4 p-3 bg-green-100 text-green-700 rounded border border-green-300">
									Account created successfully! Redirecting to dashboard...
								</div>
							)} */}
							{error && (
								<div className="mt-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
									{error}
								</div>
							)}
							<p className="text-sm md:text-base text-center text-[#000] pt-4">
								By signing up, you confirm that you have read and agree to our{" "}
								<Link href="#" className="text-[#FD5C02] underline">
									Privacy Policy
								</Link>{" "}
								and{" "}
								<Link href="#" className="text-[#FD5C02] underline">
									Terms of Use
								</Link>
							</p>
						</form>
					</CardContent>
				</Card>
			</div>
		</main>
	);
};

export default CreateAccount;
function validateForm() {
	throw new Error("Function not implemented.");
}

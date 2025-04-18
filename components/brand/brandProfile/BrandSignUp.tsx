"use client";

import React, { useState } from "react";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader } from "../../ui/card";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert"; // Make sure these components exist

const BusinessSignup = () => {
	const { loginWithGoogle } = useAuth();
	const router = useRouter();
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleGoogleSignup = async () => {
		try {
		  setError(""); 
		  setIsLoading(true);
		  
		  // Wait for the Google login to complete
		  const { isExistingAccount } = await loginWithGoogle();
		  
		  // Add a small delay to ensure auth state is fully processed
		  setTimeout(() => {
			// Navigate based on whether it's a new user or existing user
			if (!isExistingAccount) {
			  router.push("/brand/account-created");
			} else {
			  router.push("/brand/dashboard");
			}
			setIsLoading(false);
		  }, 500);
		  
		} catch (error) {
		  console.error("Google signup error:", error);
		  setIsLoading(false);
		  // Your existing error handling...
		}
	  };


	// const handleFacebookSignup = async () => {
	// 	try {
	//     await loginWithFacebook();
	//     router.push("/brand/account-created");
	//   } catch (error) {
	//     console.error("Facebook signup error:", error);
	//   }
	// };

	return (
		<main className="relative overflow-hidden min-h-screen">
			<div className="absolute inset-0">
				<Image
					src="/images/social-shake-bg.png"
					alt="Background Image"
					className="w-full h-full object-cover"
					width={1920}
					height={1080}
					priority
					quality={100}
				/>
			</div>

			{/* Dark Overlay */}
			<div className="absolute inset-0 bg-black/50" />

			{/* Signup Card */}
			<div className="relative flex items-center justify-center px-4 mt-6 xl:mt-12 font-satoshi">
				<Card className="w-full max-w-xl bg-white border-2 border-[#FFBF9B] backdrop-blur-sm px-[20px] py-[6px] md:px-[30px] md:py-[5px] lg:px-[50px] lg:py-[5px]">
					<CardHeader className="space-y-3 items-center text-center">
						<div className="w-32 h-8 mb-8">
							<Image
								src="/images/logo.svg"
								alt="Social Shake logo"
								width={110}
								height={110}
							/>
						</div>
						<h1 className="text-lg md:text-xl lg:text-2xl font-semibold">
							Join Social Shake and Connect with Top Creators!
						</h1>
						<p className="mb-5 text-sm md:text-base text-[#000] font-normal">
							Sign up to launch contests, collaborate with creators, and grow
							your brand with user-generated content.
						</p>
						<div className="flex space-x-1">
							<p className="text-gray-600 text-sm md:text-base">
								Already have an account?
							</p>
							<Link
								href="/brand/login"
								className="text-[#FD5C02] font-medium hover:underline text-sm md:text-base"
							>
								Log in
							</Link>
						</div>
					</CardHeader>
					<CardContent className="space-y-3">
						{/* Error Alert */}
						{error && (
							<Alert variant="destructive" className="mb-3">
								<AlertDescription className="flex items-center">
									{error}
									{error.includes("already in use") && (
										<Link href="/brand/login" className="ml-2 text-[#FD5C02] font-medium hover:underline">
											Log in now
										</Link>
									)}
								</AlertDescription>
							</Alert>
						)}
						
						<Button className="w-full bg-[#FD5C02] hover:bg-orange-600 text-white text-base md:text-[17px] py-5 font-normal">
							<Link
								href="/brand/create-account"
								className="flex items-center justify-center gap-2 w-full"
							>
								Sign up with Email
								<Image
									src="/icons/email.svg"
									alt="Email"
									width={20}
									height={20}
								/>
							</Link>
						</Button>
						<Button
							variant="outline"
							className="w-full text-base md:text-[17px] py-5 font-normal border border-gray-300"
							onClick={handleGoogleSignup}
							disabled={isLoading}
						>
							<Image
								src="/icons/google.png"
								alt="Google"
								className="mr-1"
								width={20}
								height={20}
							/>
							Sign up with Google
						</Button>
						{/* <Button
							variant="outline"
							className="w-full text-base md:text-[17px] py-5 font-normal border border-gray-300"
							onClick={handleFacebookSignup}
							disabled={loading}
						>
							<Image
								src="/icons/facebook.svg"
								alt="Facebook"
								className="mr-1"
								width={20}
								height={20}
							/>
							Sign up with Facebook
						</Button> */}

						<p className="text-sm md:text-base text-center text-[#000] pt-2">
							By signing up, you confirm that you have read and agree to our{" "}
							<Link href="#" className="text-[#FD5C02] hover:underline">
								Privacy Policy
							</Link>{" "}
							and{" "}
							<Link href="#" className="text-[#FD5C02] hover:underline">
								Terms of Use
							</Link>
						</p>
					</CardContent>
				</Card>
			</div>
		</main>
	);
};

export default BusinessSignup;
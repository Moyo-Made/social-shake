import React from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import Image from "next/image";
import Link from "next/link";

const BusinessSignup = () => {
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

			{/* Signup Card */}
			<div className="relative flex items-center justify-center px-4 mt-6 xl:mt-12 font-satoshi">
				<Card className="w-full max-w-xl bg-white border-2 border-[#FFBF9B] backdrop-blur-sm px-[20px] py-[6px] md:px-[30px] md:py-[5px] lg:px-[50px] lg:py-[5px]">
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
							<Link href="/login" className="text-[#FD5C02] hover:underline font-medium text-sm md:text-base">
								Log in
							</Link>
						</div>
					</CardHeader>
					<CardContent className="space-y-3">
						<Button className="w-full bg-[#FD5C02] hover:bg-orange-600 text-white text-base md:text-[17px] py-5 font-normal">
							<Link href="/create-account" className="flex items-center justify-center gap-2">
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
						<Button
							variant="outline"
							className="w-full text-base md:text-[17px] py-5 font-normal border border-gray-300"
						>
							<Image
								src="/icons/facebook.svg"
								alt="Facebook"
								className="mr-1"
								width={20}
								height={20}
							/>
							Sign up with Facebook
						</Button>
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

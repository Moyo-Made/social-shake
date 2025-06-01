"use client";

import React, { useState } from "react";
import { Button } from "../../ui/button";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

	const testimonials = [
		{
			name: "London Walace",
			date: "May 28, 2025",
			rating: 5,
			text: "As a fast-moving brand, we needed a reliable, organized, and scalable way to source authentic user-generated content. Social Shake made it effortless. From setting campaign requirements to reviewing submissions and managing payments—it's all in one place.",
			avatar: "/icons/london.svg"
		},
		{
			name: "Emma Carter",
			date: "May 29, 2025",
			rating: 5,
			text: "We were on the hunt for a solution to streamline our influencer collaborations. Thanks to Social Shake, we can now connect with the right creators easily, track progress, and measure impact—all in real-time.",
			avatar: "/icons/emma.svg"
		},
		{
			name: "James Thompson",
			date: "June 01, 2025",
			rating: 5,
			text: "Our marketing team was overwhelmed with content requests. Social Shake helped us automate the process, allowing us to focus on strategy rather than logistics, leading to more impactful campaigns.",
			avatar: "/icons/james.svg"
		},
		{
			name: "Sophia Chen",
			date: "May 28, 2025",
			rating: 5,
			text: "The ability to curate and manage user-generated content from diverse platforms has transformed our brand strategy. Social Shake has been a game-changer in enhancing our authenticity.",
			avatar: "/icons/sophia.svg"
		},
		{
			name: "Oliver Smith",
			date: "June 02, 2025",
			rating: 5,
			text: "Finding a platform that offers seamless integration with our existing tools was critical. Social Shake not only met our needs but exceeded them, driving exceptional engagement with our audience.",
			avatar: "/icons/oliver.svg"
		}
	];

	return (
		<main className="min-h-screen bg-white font-satoshi">

			<div className="flex min-h-[calc(100vh-100px)]">
				{/* Left Side - Testimonials */}
				<div className="w-1/2 bg-black p-8 overflow-y-auto">
					<div className="space-y-6">
						{testimonials.map((testimonial, index) => (
							<div key={index} className="bg-gray-900 rounded-lg p-4">
								<div className="flex items-center mb-3">
									<div className="w-10 h-10 bg-gray-600 rounded-full mr-3 flex items-center justify-center overflow-hidden">
										<Image
											src={testimonial.avatar}
											alt={testimonial.name}
											width={40}
											height={40}
											className="rounded-full"
											loading="lazy"
										/>
										<div className="w-full h-full bg-gray-600 rounded-full items-center justify-center text-white text-sm font-medium hidden">
											{testimonial.name.split(' ').map(n => n[0]).join('')}
										</div>
									</div>
									<div className="flex-1">
										<div className="flex items-center justify-between">
											<h4 className="text-white font-medium">{testimonial.name}</h4>
											<span className="text-gray-400 text-sm">{testimonial.date}</span>
										</div>
										<div className="flex items-center mt-1">
											{[...Array(testimonial.rating)].map((_, i) => (
												<span key={i} className="text-yellow-400 text-sm">★</span>
											))}
										</div>
									</div>
								</div>
								<p className="text-gray-300 text-sm leading-relaxed">
									{testimonial.text}
								</p>
							</div>
						))}
					</div>
				</div>

				{/* Right Side - Signup Form */}
				<div className="w-1/2 bg-white flex items-center justify-center p-8">
					<div className="w-full max-w-md">
						<div className="text-center mb-6">
							<h1 className="text-3xl font-bold text-gray-900 mb-4">
								Join Social Shake and<br />Connect with Top Creators!
							</h1>
							<p className="text-gray-600 mb-4">
								Sign up to launch contests, collaborate with creators, and grow your brand with user-generated content.
							</p>
							<div className="flex justify-center items-center space-x-1">
								<span className="text-gray-600">Already have an account?</span>
								<Link
									href="/brand/login"
									className="text-[#FD5C02] font-medium hover:underline"
								>
									Log in
								</Link>
							</div>
						</div>

						<div className="space-y-4">
							{/* Error Alert */}
							{error && (
								<Alert variant="destructive" className="mb-4">
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

							{/* Sign up with Email */}
							<Button className="w-full bg-[#FD5C02] hover:bg-orange-600 text-white py-4 rounded-lg">
								<Link
									href="/brand/create-account"
									className="flex items-center justify-center gap-2 w-full"
								>
									<span>Sign up with Email</span>
									<Image
										src="/icons/email.svg"
										alt="Email"
										width={20}
										height={20}
									/>
								</Link>
							</Button>

							{/* Sign up with Google */}
							<Button
								variant="outline"
								className="w-full py-4 rounded-lg border border-gray-300 hover:bg-gray-50"
								onClick={handleGoogleSignup}
								disabled={isLoading}
							>
								<Image
									src="/icons/google.png"
									alt="Google"
									className="mr-2"
									width={20}
									height={20}
								/>
								Sign up with Google
							</Button>

							{/* Sign up with Facebook */}
							{/* <Button
								variant="outline"
								className="w-full py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50"
								onClick={handleFacebookSignup}
								disabled={isLoading}
							>
								<Image
									src="/icons/facebook.svg"
									alt="Facebook"
									className="mr-2"
									width={20}
									height={20}
								/>
								Sign up with Facebook
							</Button> */}
						</div>

						{/* Terms and Privacy */}
						<p className="text-sm text-center text-gray-600 mt-6">
							By signing up, you confirm that you have read and agree to our{" "}
							<Link href="#" className="text-[#FD5C02] hover:underline">
								Privacy Policy
							</Link>{" "}
							and{" "}
							<Link href="#" className="text-[#FD5C02] hover:underline">
								Terms of Use
							</Link>
						</p>
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="bg-white border-t border-gray-200 py-4">
				<div className="flex justify-between items-center px-8">
					<p className="text-gray-500 text-sm">© 2025 Social Shake. All rights reserved.</p>
					<div className="flex space-x-4">
						<Link href="#" className="text-gray-400 hover:text-gray-600">
							<Image src="/icons/instagram.svg" alt="Instagram" width={20} height={20} />
						</Link>
						<Link href="#" className="text-gray-400 hover:text-gray-600">
							<Image src="/icons/twitter.svg" alt="Twitter" width={20} height={20} />
						</Link>
						<Link href="#" className="text-gray-400 hover:text-gray-600">
							<Image src="/icons/tiktok.svg" alt="TikTok" width={20} height={20} />
						</Link>
					</div>
				</div>
			</div>
		</main>
	);
};

export default BusinessSignup;
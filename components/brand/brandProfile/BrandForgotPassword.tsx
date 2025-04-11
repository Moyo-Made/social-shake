/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa6";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/config/firebase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const ForgotPassword = () => {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState({ type: "", text: "" });

	const handleResetPassword = async (e: { preventDefault: () => void }) => {
		e.preventDefault();

		// Basic validation
		if (!email.trim()) {
			setMessage({ type: "error", text: "Please enter your email address" });
			return;
		}

		setIsLoading(true);
		setMessage({ type: "", text: "" });

		try {
			// Firebase password reset
			await sendPasswordResetEmail(auth, email);
			setMessage({
				type: "success",
				text: "Password reset link sent! Check your email inbox.",
			});
			setEmail("");
		} catch (error: any) {
			console.error("Reset password error:", error);

			// Handle different Firebase error codes
			if (error.code === "auth/user-not-found") {
				setMessage({
					type: "error",
					text: "No account with that email address exists.",
				});
			} else if (error.code === "auth/invalid-email") {
				setMessage({
					type: "error",
					text: "Please enter a valid email address.",
				});
			} else if (error.code === "auth/too-many-requests") {
				setMessage({
					type: "error",
					text: "Too many attempts. Please try again later.",
				});
			} else {
				setMessage({
					type: "error",
					text: "Failed to send reset email. Please try again.",
				});
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<main className="relative overflow-hidden min-h-screen">
			<div className="absolute inset-0">
				<Image
					src="/images/social-shake-bg.png"
					alt="Background Image"
					className="w-full h-full object-cover"
					layout="fill"
				/>
			</div>

			{/* Dark Overlay */}
			<div className="absolute inset-0 bg-black/50" />

			{/* Forgot Password Card */}
			<div className="relative flex items-center justify-center px-4 py-16 xl:py-24 font-satoshi">
				<Card className="w-full max-w-xl bg-white border-2 border-[#FFBF9B] backdrop-blur-sm px-[2px] py-[6px] md:px-[30px] md:py-[10px] lg:px-[50px] lg:py-[20px]">
					<CardHeader className="space-y-2 items-center text-center">
						<h1 className="text-lg md:text-xl lg:text-2xl text-gray-900 font-semibold">
							Forgot Password?
						</h1>
						<p className="w-full mb-5 text-sm md:text-base text-gray-600 font-normal">
							No worries, we&apos;ll send you reset instructions.
						</p>
					</CardHeader>
					<CardContent className="space-y-4 md:space-y-5">
						<form onSubmit={handleResetPassword} className="space-y-4">
							{/* Status Alert */}
							{message.text && (
								<Alert
									className={
										message.type === "error"
											? "bg-red-50 border-red-200 text-red-800"
											: "bg-green-50 border-green-200 text-green-800"
									}
								>
									<AlertDescription>{message.text}</AlertDescription>
								</Alert>
							)}

							{/* Email Field */}
							<div className="space-y-1">
								<Label
									htmlFor="email"
									className="text-sm font-medium"
								>
									Email
								</Label>
								<Input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="Enter your business email"
									className="w-full placeholder:text-sm md:py-3"
								/>
							</div>

							{/* Submit Button */}
							<Button
								type="submit"
								disabled={isLoading}
								className="w-full bg-[#FD5C02] hover:bg-orange-600 text-white text-[17px] py-5 font-normal"
							>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
									</>
								) : (
									<>
										Reset Password{" "}
										<FaArrowRight className="w-5 h-5 ml-2 mt-1" />
									</>
								)}
							</Button>
						</form>

						<div className="flex justify-center items-center space-x-2">
							<FaArrowLeft className="w-5 h-5 ml-1 mt-0.5" />
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

"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "../../ui/card";
import Image from "next/image";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { FaArrowRight } from "react-icons/fa6";
import { Label } from "../../ui/label";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface FormData {
	email: string;
	password: string;
}

interface FieldErrors {
	email?: string;
	password?: string;
}

const Login = () => {
	const {
		login,
		error: authError,
		isLoading,
		clearError,
		hasProfile,
	} = useAuth();
	const [formData, setFormData] = useState<FormData>({
		email: "",
		password: "",
	});
	const [formError, setFormError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const router = useRouter();

	// Map auth errors to user-friendly form errors when they occur
	useEffect(() => {
		if (authError) {
			// Create user-friendly error messages
			let friendlyMessage =
				"We couldn't find an account with these credentials. Please check your email and password.";

			if (
				authError.includes("user-not-found") ||
				authError.includes("wrong-password")
			) {
				friendlyMessage =
					"We couldn't find an account with these credentials. Please check your email and password.";
				setFieldErrors((prev) => ({
					...prev,
					email: "Incorrect email or password",
				}));
			} else if (authError.includes("invalid-email")) {
				friendlyMessage = "Please enter a valid email address.";
				setFieldErrors((prev) => ({
					...prev,
					email: "Invalid email format",
				}));
			} else if (authError.includes("too-many-requests")) {
				friendlyMessage =
					"For security reasons, this account has been temporarily locked. Please try again later or reset your password.";
			} else if (authError.includes("user-disabled")) {
				friendlyMessage =
					"Your account has been disabled. Please contact our support team for assistance.";
			} else if (authError.includes("network-request-failed")) {
				friendlyMessage =
					"Network connection issue. Please check your internet connection and try again.";
			}

			setFormError(friendlyMessage);
			setIsSubmitting(false);
		}
	}, [authError]);

	// Clear form errors when inputs change
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		const { id, value } = e.target;

		setFormData({
			...formData,
			[id]: value.trim(),
		});

		// Clear field-specific error when that field changes
		if (fieldErrors[id as keyof typeof fieldErrors]) {
			setFieldErrors((prev) => ({
				...prev,
				[id]: undefined,
			}));
		}

		// Clear general error message when any field changes
		if (formError) {
			setFormError(null);
		}

		// Clear auth errors when form changes
		if (authError) {
			clearError();
		}
	};

	const validateForm = (): boolean => {
		const errors: FieldErrors = {};
		let isValid = true;

		// Validate email
		if (!formData.email.trim()) {
			errors.email = "Email is required";
			isValid = false;
		} else if (!/\S+@\S+\.\S+/.test(formData.email)) {
			errors.email = "Please enter a valid email";
			isValid = false;
		}

		// Validate password
		if (!formData.password.trim()) {
			errors.password = "Password is required";
			isValid = false;
		}

		setFieldErrors(errors);
		return isValid;
	};

	const handleSubmit = async (
		e: React.FormEvent<HTMLFormElement>
	): Promise<void> => {
		e.preventDefault();

		// Clear previous errors
		setFormError(null);
		clearError();

		// Validate the form
		if (!validateForm()) {
			return;
		}

		// Set submitting state to show loading UI
		setIsSubmitting(true);

		try {
			// Attempt to log in
			await login(formData.email, formData.password);

			// Check if user has a brand profile
			try {
				const response = await fetch(
					`/api/brand-profile?email=${encodeURIComponent(formData.email)}`
				);

				if (response.ok) {
					// User has a profile, go to dashboard
					router.push("/brand/dashboard");
				} else if (response.status === 404) {
					// User doesn't have a profile, go to profile creation
					router.push("/brand/create-profile");
				} else {
					// Handle other API errors
					setFormError(
						"There was a problem checking your profile. Please try again."
					);
				}
			} catch (err) {
				console.error("Profile check error:", err);
				// If we can't check the profile but authentication succeeded, make a decision based on hasProfile
				if (hasProfile) {
					router.push("/brand/dashboard");
				} else {
					router.push("/brand/create-profile");
				}
			}
		} catch (err: unknown) {
			console.error("Login error:", err);
			// Don't set the error here as it's already handled by the useEffect that watches authError
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className="relative overflow-hidden min-h-screen">
			<div className="absolute inset-0">
				<Image
					src="/images/social-shake-bg.png"
					alt="Background Image"
					width={1920}
					height={1080}
					priority
					className="object-cover w-full h-full"
				/>
			</div>

			<div className="absolute inset-0 bg-black/50" />

			<div className="relative flex items-center justify-center px-4 py-6 xl:py-12 font-satoshi">
				<Card className="w-full max-w-xl bg-white border-2 border-[#FFBF9B] backdrop-blur-sm px-[2px] py-[6px] md:px-[30px] md:py-[5px] lg:px-[50px] lg:py-[5px]">
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
							Welcome Back
						</h1>
						<p className="w-full mb-5 text-sm md:text-base text-[#000] font-normal">
							Log in to connect with creators and track your brand&#39;s
							success.
						</p>
					</CardHeader>

					<CardContent className="space-y-3 md:space-y-4">
						{/* Display user-friendly error message at the top if it exists */}
						{formError && (
							<div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm mb-2">
								{formError}
							</div>
						)}

						<form onSubmit={handleSubmit} noValidate>
							<div className="space-y-1">
								<Label htmlFor="email" className="text-sm font-medium">
									Email <span className="text-red-500">*</span>
								</Label>
								<Input
									id="email"
									type="email"
									value={formData.email}
									onChange={handleChange}
									placeholder="Enter your business email"
									className={`w-full placeholder:text-sm md:py-3 ${
										fieldErrors.email ? "border-red-500 focus:ring-red-500" : ""
									}`}
									required
								/>
								{fieldErrors.email && (
									<p className="text-red-500 text-sm mt-1">
										{fieldErrors.email}
									</p>
								)}
							</div>

							<div className="space-y-1 pb-3 md:pb-5 mt-3">
								<Label htmlFor="password" className="text-sm font-medium">
									Password <span className="text-red-500">*</span>
								</Label>
								<Input
									id="password"
									type="password"
									value={formData.password}
									onChange={handleChange}
									placeholder="Enter your password"
									className={`w-full placeholder:text-sm md:py-3 ${
										fieldErrors.password
											? "border-red-500 focus:ring-red-500"
											: ""
									}`}
									required
								/>
								{fieldErrors.password && (
									<p className="text-red-500 text-sm mt-1">
										{fieldErrors.password}
									</p>
								)}
							</div>

							<Button
								type="submit"
								disabled={isLoading || isSubmitting}
								className={`w-full bg-[#FD5C02] hover:bg-orange-600 text-white text-[17px] py-5 font-normal ${
									isLoading || isSubmitting
										? "opacity-50 cursor-not-allowed"
										: ""
								}`}
							>
								{isLoading || isSubmitting ? (
									<div className="flex items-center justify-center">
										<div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white-500 mr-2"></div>
										<span>Logging in...</span>
									</div>
								) : (
									<div className="flex items-center justify-center">
										Log in
										<FaArrowRight className="w-5 h-5 ml-2" />
									</div>
								)}
							</Button>
						</form>

						<Link
							href="/brand/forgot-password"
							className="flex justify-center items-center text-sm md:text-base text-[#000] hover:underline"
						>
							<p className="pt-1">Forgot Password?</p>
						</Link>

						<div className="flex justify-center space-x-1">
							<p className="text-gray-600 text-sm md:text-base">
								Don&apos;t have an account?
							</p>
							<Link
								href="/brand/signup"
								className="text-[#FD5C02] hover:underline text-sm md:text-base"
							>
								Sign up
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		</main>
	);
};

export default Login;

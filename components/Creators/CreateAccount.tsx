"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import Image from "next/image";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { FaArrowRight, FaArrowLeft } from "react-icons/fa6";
import { Button } from "../ui/button";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const CreateCreatorAccount = () => {
	const { error: authError, clearError } = useAuth();
	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		username: "",
		email: "",
		password: "",
	});
	const [formError, setFormError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [usernameChecking, setUsernameChecking] = useState(false);
	const [emailChecking, setEmailChecking] = useState(false);
	const router = useRouter();

	// Map auth errors to form errors when they occur
	useEffect(() => {
		if (authError) {
			// Map Firebase error messages to user-friendly messages and fields
			let errorMessage = authError;

			if (authError.includes("email-already-in-use")) {
				errorMessage =
					"This email address is already in use. Please log in instead.";
				setFieldErrors((prev) => ({
					...prev,
					email: "This email address is already in use.",
				}));
			} else if (authError.includes("invalid-email")) {
				errorMessage = "Please enter a valid email address.";
				setFieldErrors((prev) => ({
					...prev,
					email: "Please enter a valid email address.",
				}));
			} else if (authError.includes("weak-password")) {
				errorMessage =
					"Your password is too weak. Please choose a stronger password.";
				setFieldErrors((prev) => ({
					...prev,
					password: "Please choose a stronger password.",
				}));
			}

			setFormError(errorMessage);
			setIsSubmitting(false);
		}
	}, [authError]);

	// Check if username is available with debouncing
	useEffect(() => {
		const checkUsername = async () => {
			if (!formData.username || formData.username.length < 3) return;

			setUsernameChecking(true);
			try {
				const response = await fetch(
					`/api/check-username?username=${encodeURIComponent(formData.username)}`
				);
				const data = await response.json();

				if (!response.ok) {
					console.error("Username check error:", data.error);
					return;
				}

				if (data.exists) {
					setFieldErrors((prev) => ({
						...prev,
						username:
							"This username is already taken. Please choose another one.",
					}));
				} else {
					// Clear username error if it exists
					setFieldErrors((prev) => {
						const newErrors = { ...prev };
						delete newErrors.username;
						return newErrors;
					});
				}
			} catch (error) {
				console.error("Error checking username:", error);
			} finally {
				setUsernameChecking(false);
			}
		};

		const timeoutId = setTimeout(() => {
			if (formData.username) {
				checkUsername();
			}
		}, 500); // 500ms debounce

		return () => clearTimeout(timeoutId);
	}, [formData.username]);

	// Check if email is already registered with debouncing
	useEffect(() => {
		const checkEmail = async () => {
			if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) return;

			setEmailChecking(true);
			try {
				const response = await fetch(
					`/api/check-email?email=${encodeURIComponent(formData.email)}`
				);
				const data = await response.json();

				if (!response.ok) {
					console.error("Email check error:", data.error);
					return;
				}

				if (data.exists) {
					setFieldErrors((prev) => ({
						...prev,
						email:
							"This email address is already in use. Please log in instead.",
					}));
				} else {
					// Clear email error if it exists
					setFieldErrors((prev) => {
						const newErrors = { ...prev };
						delete newErrors.email;
						return newErrors;
					});
				}
			} catch (error) {
				console.error("Error checking email:", error);
			} finally {
				setEmailChecking(false);
			}
		};

		const timeoutId = setTimeout(() => {
			if (formData.email) {
				checkEmail();
			}
		}, 500); // 500ms debounce

		return () => clearTimeout(timeoutId);
	}, [formData.email]);

	// Clear form errors when inputs change
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { id, value } = e.target;
		setFormData({
			...formData,
			[id]: value,
		});

		// Clear field-specific error when that field changes
		if (fieldErrors[id]) {
			setFieldErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[id];
				return newErrors;
			});
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

	const validateForm = () => {
		const errors: Record<string, string> = {};
		let isValid = true;

		// Validate first name
		if (!formData.firstName.trim()) {
			errors.firstName = "First name is required";
			isValid = false;
		}

		// Validate last name
		if (!formData.lastName.trim()) {
			errors.lastName = "Last name is required";
			isValid = false;
		}

		// Validate username
		if (!formData.username.trim()) {
			errors.username = "Username is required";
			isValid = false;
		}

		// Validate email
		if (!formData.email.trim()) {
			errors.email = "Email is required";
			isValid = false;
		} else if (!/\S+@\S+\.\S+/.test(formData.email)) {
			errors.email = "Email is invalid";
			isValid = false;
		}

		// Validate password
		if (!formData.password) {
			errors.password = "Password is required";
			isValid = false;
		} else if (formData.password.length < 8) {
			errors.password = "Password must be at least 8 characters long";
			isValid = false;
		}

		setFieldErrors(errors);
		return isValid;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Clear previous errors
		setFormError(null);
		clearError();

		// Validate the form
		if (!validateForm()) {
			return;
		}

		setIsSubmitting(true);
		
		try {
			// Check for username availability
			const usernameResponse = await fetch(
				`/api/check-username?username=${encodeURIComponent(formData.username)}`
			);
			const usernameData = await usernameResponse.json();

			if (usernameData.exists) {
				setFieldErrors((prev) => ({
					...prev,
					username:
						"This username is already taken. Please choose another one.",
				}));
				setIsSubmitting(false);
				return;
			}
			
			// Check for email availability
			const emailResponse = await fetch(
				`/api/check-email?email=${encodeURIComponent(formData.email)}`
			);
			const emailData = await emailResponse.json();
			
			if (emailData.exists) {
				setFieldErrors((prev) => ({
					...prev,
					email: "This email address is already in use. Please log in instead.",
				}));
				setFormError("This email address is already in use. Please log in instead.");
				setIsSubmitting(false);
				return;
			}

			// If we get here, both username and email are available
			// Now proceed with creating the account
			
			// After successful signup, create creator profile
			const response = await fetch("/api/creator-profile", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: formData.email,
					firstName: formData.firstName,
					lastName: formData.lastName,
					username: formData.username.toLowerCase(), // Store lowercase for searching
					displayUsername: formData.username, // Preserve original casing for display
					userType: "creator",
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.error || "Failed to create creator profile"
				);
			}

			router.push("/creator/account-created");
		} catch (err) {
			// This catches any errors not handled by the auth context
			console.error("Signup error:", err);
			if (err instanceof Error) {
				setFormError(err.message || "An error occurred during signup");
			} else {
				setFormError("An error occurred during signup");
			}
			setIsSubmitting(false);
		}
	};

	// Use combined loading state from auth and local form state
	const isLoading =  isSubmitting;

	return (
		<main className="relative min-h-screen overflow-y-auto">
			<div className="absolute inset-0">
				<Image
					src="/images/social-shake-bg.png"
					alt="Background Image"
					className="w-full h-full object-cover"
					width={1920}
					height={1080}
					priority
					quality={100}
					loading="eager"
				/>
			</div>

			{/* Dark Overlay */}
			<div className="absolute inset-0 bg-black/50" />

			{/* Signup Card */}
			<div className="relative flex items-center justify-center px-4 py-6 xl:py-8 font-satoshi">
				<Card className="w-full max-w-xl bg-white border-2 border-[#FFBF9B] backdrop-blur-sm px-[2px] py-[6px] md:px-[30px] md:py-[5px] lg:px-[50px] lg:py-[5px]">
					<Link href="/creator/signup">
						<FaArrowLeft className="w-5 h-5 absolute left-8 md:left-6 top-12 md:top-10" />
					</Link>
					<CardHeader className="space-y-2 items-center text-center">
						<div className="w-32 h-8 mb-8">
							<Image
								src="/images/logo.svg"
								alt="Social Shake logo"
								width={110}
								height={110}
							/>
						</div>
						<h1 className="text-lg md:text-xl lg:text-2xl font-semibold ">
							Join Social Shake as a Creator
						</h1>
						<p className="mb-6 text-sm md:text-base text-[#000] font-normal">
							Sign up to connect with top brands, showcase your creativity, and
							get paid for your content.
						</p>
						<div className="flex space-x-1">
							<p className="text-gray-600 text-sm md:text-base">
								Already have an account?
							</p>
							<Link
								href="/login"
								className="text-[#FD5C02] hover:underline text-sm md:text-base"
							>
								Log in
							</Link>
						</div>
					</CardHeader>

					<CardContent className="space-y-3 md:space-y-4">
						<form onSubmit={handleSubmit} noValidate>
							{/* Name Fields Row */}
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1">
									<Label htmlFor="firstName" className="text-sm font-medium">
										First Name <span className="text-red-500">*</span>
									</Label>
									<Input
										id="firstName"
										type="text"
										value={formData.firstName}
										onChange={handleChange}
										placeholder="Your First Name"
										className={`w-full placeholder:text-sm py-3 ${
											fieldErrors.firstName
												? "border-red-500 focus:ring-red-500"
												: ""
										}`}
										required
									/>
									{fieldErrors.firstName && (
										<p className="text-red-500 text-sm mt-1">
											{fieldErrors.firstName}
										</p>
									)}
								</div>
								<div className="space-y-1">
									<Label htmlFor="lastName" className="text-sm font-medium">
										Last Name <span className="text-red-500">*</span>
									</Label>
									<Input
										id="lastName"
										type="text"
										value={formData.lastName}
										onChange={handleChange}
										placeholder="Your Last Name"
										className={`w-full placeholder:text-sm py-3 ${
											fieldErrors.lastName
												? "border-red-500 focus:ring-red-500"
												: ""
										}`}
										required
									/>
									{fieldErrors.lastName && (
										<p className="text-red-500 text-sm mt-1">
											{fieldErrors.lastName}
										</p>
									)}
								</div>
							</div>

							{/* Username Field */}
							<div className="space-y-1 mt-3 md:mt-4">
								<Label htmlFor="username" className="text-sm font-medium">
									Username <span className="text-red-500">*</span>
								</Label>
								<Input
									id="username"
									type="text"
									value={formData.username}
									onChange={handleChange}
									placeholder="Your Preferred Username"
									className={`w-full placeholder:text-sm py-3 ${
										fieldErrors.username
											? "border-red-500 focus:ring-red-500"
											: ""
									}`}
									required
								/>
								{!fieldErrors.username && (
									<p className="text-gray-600 text-sm font-normal pt-px">
										This can be the same as your TikTok Username
									</p>
								)}
								{fieldErrors.username && (
									<p className="text-red-500 text-sm mt-1">
										{fieldErrors.username}
									</p>
								)}
								{usernameChecking && (
									<p className="text-blue-500 text-sm mt-1">
										Checking username availability...
									</p>
								)}
							</div>

							{/* Email Field */}
							<div className="space-y-1 mt-3 md:mt-4">
								<Label htmlFor="email" className="text-sm font-medium">
									Email <span className="text-red-500">*</span>
								</Label>
								<Input
									id="email"
									type="email"
									value={formData.email}
									onChange={handleChange}
									placeholder="Enter your business email"
									className={`w-full placeholder:text-sm py-3 ${
										fieldErrors.email ? "border-red-500 focus:ring-red-500" : ""
									}`}
									required
								/>
								{fieldErrors.email && (
									<p className="text-red-500 text-sm mt-1">
										{fieldErrors.email}
									</p>
								)}
								{emailChecking && (
									<p className="text-blue-500 text-sm mt-1">
										Checking email availability...
									</p>
								)}
							</div>

							{/* Password Field */}
							<div className="space-y-1 mt-3 md:mt-4">
								<Label htmlFor="password" className="text-sm font-medium">
									Password <span className="text-red-500">*</span>
								</Label>
								<Input
									id="password"
									type="password"
									value={formData.password}
									onChange={handleChange}
									placeholder="Create a password"
									className={`w-full placeholder:text-sm py-3 ${
										fieldErrors.password
											? "border-red-500 focus:ring-red-500"
											: ""
									}`}
									minLength={8}
									required
								/>
								{fieldErrors.password ? (
									<p className="text-red-500 text-sm mt-1">
										{fieldErrors.password}
									</p>
								) : (
									<p className="text-gray-600 text-sm font-normal pt-px">
										Must be at least 8 characters.
									</p>
								)}
							</div>

							{/* Submit Button */}
							<Button
								type="submit"
								disabled={isLoading || Object.keys(fieldErrors).length > 0}
								className={`w-full bg-[#FD5C02] hover:bg-orange-600 text-white text-[17px] py-5 font-normal mt-4 ${
									isLoading || Object.keys(fieldErrors).length > 0 ? "opacity-50 cursor-not-allowed" : ""
								}`}
							>
								{isLoading ? (
									"Creating account..."
								) : (
									<>
										Create Account{" "}
										<FaArrowRight className="w-5 h-5 ml-2 mt-0.5" />
									</>
								)}
							</Button>

							<p className="text-sm text-center text-[#000] pt-3">
								By signing up, you confirm that you have read and agree to our{" "}
								<Link href="#" className="text-[#FD5C02] underline">
									Privacy Policy
								</Link>{" "}
								and{" "}
								<Link href="#" className="text-[#FD5C02] underline">
									Terms of Use
								</Link>
								.
							</p>
						</form>
					</CardContent>
				</Card>
			</div>
		</main>
	);
};

export default CreateCreatorAccount;
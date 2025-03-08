"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import Image from "next/image";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { FaArrowRight, FaArrowLeft } from "react-icons/fa6";
import { Button } from "./ui/button";
import { useAuth } from "@/context/AuthContext";

const CreateAccount = () => {
	const { signup, error: authError, loading, clearError } = useAuth();
	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		email: "",
		password: "",
	});
	const [formError, setFormError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<{
		firstName?: string;
		lastName?: string;
		email?: string;
		password?: string;
	}>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Map auth errors to form errors when they occur
	useEffect(() => {
		if (authError) {
			// Map Firebase error messages to user-friendly messages and fields
			let errorMessage = authError;
			
			if (authError.includes("email-already-in-use")) {
				errorMessage = "This email address is already in use. Please use a different email or login.";
				setFieldErrors(prev => ({
					...prev,
					email: "This email address is already in use."
				}));
			} else if (authError.includes("invalid-email")) {
				errorMessage = "Please enter a valid email address.";
				setFieldErrors(prev => ({
					...prev,
					email: "Please enter a valid email address."
				}));
			} else if (authError.includes("weak-password")) {
				errorMessage = "Your password is too weak. Please choose a stronger password.";
				setFieldErrors(prev => ({
					...prev,
					password: "Please choose a stronger password."
				}));
			}
			
			setFormError(errorMessage);
			setIsSubmitting(false);
		}
	}, [authError]);

	// Clear form errors when inputs change
	const handleChange = (e: { target: { id: any; value: any } }) => {
		const { id, value } = e.target;
		setFormData({
			...formData,
			[id]: value,
		});
		
		// Clear field-specific error when that field changes
		if (fieldErrors[id as keyof typeof fieldErrors]) {
			setFieldErrors(prev => ({
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
		const errors: {
			firstName?: string;
			lastName?: string;
			email?: string;
			password?: string;
		} = {};
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

	const handleSubmit = async (e: { preventDefault: () => void }) => {
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
			// Attempt to sign up
			await signup(formData.email, formData.password);
			// If successful, the auth context will handle navigation
		} catch (err: any) {
			// This catches any errors not handled by the auth context
			console.error("Signup error:", err);
			setFormError(err.message || "An error occurred during signup");
			setIsSubmitting(false);
		}
	};

	// Use combined loading state from auth and local form state
	const isLoading = loading || isSubmitting;

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
						<form onSubmit={handleSubmit} noValidate>
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
										className={`w-full placeholder:text-sm md:placeholder:text-base md:py-5 ${
											fieldErrors.firstName ? "border-red-500 focus:ring-red-500" : ""
										}`}
										required
									/>
									{fieldErrors.firstName && (
										<p className="text-red-500 text-sm mt-1">{fieldErrors.firstName}</p>
									)}
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
										className={`w-full placeholder:text-sm md:placeholder:text-base md:py-5 ${
											fieldErrors.lastName ? "border-red-500 focus:ring-red-500" : ""
										}`}
										required
									/>
									{fieldErrors.lastName && (
										<p className="text-red-500 text-sm mt-1">{fieldErrors.lastName}</p>
									)}
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
									className={`w-full placeholder:text-sm md:placeholder:text-base md:py-5 ${
										fieldErrors.email ? "border-red-500 focus:ring-red-500" : ""
									}`}
									required
								/>
								{fieldErrors.email && (
									<p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
								)}
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
									className={`w-full placeholder:text-sm md:placeholder:text-base md:py-5 ${
										fieldErrors.password ? "border-red-500 focus:ring-red-500" : ""
									}`}
									minLength={8}
									required
								/>
								{fieldErrors.password ? (
									<p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
								) : (
									<p className="text-gray-600 text-sm md:text-base font-normal pt-px">
										Must be at least 8 characters.
									</p>
								)}
							</div>

							{/* Submit Button */}
							<Button
								type="submit"
								disabled={isLoading}
								className={`w-full bg-[#FD5C02] hover:bg-orange-600 text-white text-[17px] py-5 font-normal ${
									isLoading ? "opacity-50 cursor-not-allowed" : ""
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
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const ContactUs = () => {
	const [formData, setFormData] = useState({
		fullName: "",
		email: "",
		subject: "",
		message: ""
	});
	const [isLoading, setIsLoading] = useState(false);
	const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null); // 'success', 'error', or null
	const [charCount, setCharCount] = useState(0);

	interface FormData {
		fullName: string;
		email: string;
		subject: string;
		message: string;
	}

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target;
		setFormData((prev: FormData) => ({
			...prev,
			[name]: value
		}));

		if (name === 'message') {
			setCharCount(value.length);
		}
	};

	const validateForm = () => {
		const { fullName, email, subject, message } = formData;
		
		if (!fullName.trim()) return "Full name is required";
		if (!email.trim()) return "Email address is required";
		if (!email.includes('@')) return "Please enter a valid email address";
		if (!subject.trim()) return "Subject is required";
		if (!message.trim()) return "Message is required";
		if (message.length > 2000) return "Message must be less than 2000 characters";
		
		return null;
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
		e.preventDefault();
		
		const validationError: string | null = validateForm();
		if (validationError) {
			setSubmitStatus('error');
			return;
		}

		setIsLoading(true);
		setSubmitStatus(null);

		try {
			// Method 1: Using your own API endpoint
			const response: Response = await fetch('/api/contact', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			});

			if (response.ok) {
				setSubmitStatus('success');
				setFormData({
					fullName: "",
					email: "",
					subject: "",
					message: ""
				});
				setCharCount(0);
			} else {
				setSubmitStatus('error');
			}
		} catch (error: unknown) {
			console.error('Error sending message:', error);
			setSubmitStatus('error');
		} finally {
			setIsLoading(false);
		}

	
	
	};

	return (
		<div className="min-h-screen bg-gray-50 font-satoshi">

			{/* Main Content */}
			<div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
				<Card className="border-2 border-gray-200 shadow-none">
					<CardHeader className="text-center space-y-2 pb-7">
						<h1 className="text-2xl font-bold text-gray-900">
							Get in Touch with the Social Shake Team
						</h1>
						<p className="text-gray-600 text-base">
							Share your questions, ideas, or partnership inquiries.
						</p>
					</CardHeader>

					<CardContent className="space-y-6">
						{/* Status Alerts */}
						{submitStatus === 'success' && (
							<div className="flex items-center justify-start">

							<Alert className="border-green-200 bg-green-50">
								<CheckCircle className="h-4 w-4 text-green-600" />
								<AlertDescription className="text-green-800 pt-1">
									Thank you for your message! We&apos;ll get back to you within 24 hours.
								</AlertDescription>
							</Alert>
							</div>
						)}

						{submitStatus === 'error' && (
							<Alert variant="destructive">
								<XCircle className="h-4 w-4" />
								<AlertDescription>
									There was an error sending your message. Please try again or contact us directly at hello@socialshake.com
								</AlertDescription>
							</Alert>
						)}

						<form onSubmit={handleSubmit} className="space-y-4">
							{/* Full Name */}
							<div className="space-y-2">
								<Label htmlFor="fullName" className="text-base text-gray-900">
									Full Name
								</Label>
								<Input
									id="fullName"
									name="fullName"
									type="text"
									placeholder="Colina"
									value={formData.fullName}
									onChange={handleInputChange}
									className=" text-base border-gray-300"
									required
								/>
							</div>

							{/* Email Address */}
							<div className="space-y-2">
								<Label htmlFor="email" className="text-base text-gray-900">
									Email Address
								</Label>
								<Input
									id="email"
									name="email"
									type="email"
									placeholder="colina@test.com"
									value={formData.email}
									onChange={handleInputChange}
									className="text-base border-gray-300"
									required
								/>
							</div>

							{/* Subject */}
							<div className="space-y-2">
								<Label htmlFor="subject" className="text-base text-gray-900">
									Subject
								</Label>
								<Input
									id="subject"
									name="subject"
									type="text"
									placeholder="Your Subject"
									value={formData.subject}
									onChange={handleInputChange}
									className="text-base border-gray-300"
									required
								/>
							</div>

							{/* Message */}
							<div className="space-y-2">
								<Label htmlFor="message" className="text-base text-gray-900">
									Your Message
								</Label>
								<Textarea
									id="message"
									name="message"
									placeholder="Type your message here..."
									value={formData.message}
									onChange={handleInputChange}
									className="min-h-[150px] text-base border-gray-300 resize-vertical"
									maxLength={2000}
									required
								/>
								<div className="flex justify-end">
									<span className={`text-sm ${charCount > 1800 ? 'text-red-600' : 'text-gray-500'}`}>
										Max. 2000 Chars ({charCount}/2000)
									</span>
								</div>
							</div>

							{/* Submit Button */}
							<Button
								type="submit"
								disabled={isLoading}
								className="w-full bg-[#FD5C02] hover:bg-orange-600 text-white py-3 rounded-lg transition-colors"
							>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-5 w-5 animate-spin" />
										Sending Message...
									</>
								) : (
									'Send Message'
								)}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default ContactUs;
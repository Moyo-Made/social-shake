"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import UploadVerificationVideo from "@/components/Creators/verify-identity/UploadVerificationVideo";
import { ArrowRight } from "lucide-react";
import CreatorProfileForm from "@/components/Creators/verify-identity/CompleteCreatorProfile";
import {
	CreatorVerificationProvider,
	useCreatorVerification,
} from "@/components/Creators/verify-identity/CreatorVerificationContext";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import UploadPortfolioVideos from "@/components/Creators/verify-identity/UploadPortfolioVideos";


// Wrap the actual page content in this component to access the context
function VerifyIdentityContent() {
	const router = useRouter();
	const { currentUser } = useAuth();
	const [activeTab, setActiveTab] = useState<string>("upload-verification");
	const {
		isVerificationComplete,
		isPortfolioComplete,
		loading,
	} = useCreatorVerification();

	// If user isn't authenticated, redirect to login
	useEffect(() => {
		if (!currentUser) {
			toast.error("Please log in to continue with verification");
			router.push("/creator/login");
		}
	}, [currentUser, router]);

	// Load active tab from session storage on initial render - use a stable reference
	const loadTabFromStorage = useCallback(() => {
		try {
			const storedTab = sessionStorage.getItem("activeVerificationTab");
			if (storedTab) {
				setActiveTab(storedTab);
			}
		} catch (error) {
			console.error("Error reading from session storage:", error);
		}
	}, []);

	// Initialize on first render
	useEffect(() => {
		loadTabFromStorage();
	}, [loadTabFromStorage]);

	// Store active tab in session storage when it changes
	useEffect(() => {
		try {
			sessionStorage.setItem("activeVerificationTab", activeTab);
		} catch (error) {
			console.error("Error writing to session storage:", error);
		}
	}, [activeTab]);

	const handleTabChange = (value: string) => {
		setActiveTab(value);
	};

	const handleNextClick = () => {
		// First check if user is authenticated
		if (!currentUser) {
			toast.error("You must be logged in to complete verification");
			router.push("/creator/login");
			return;
		}

		if (activeTab === "upload-verification") {
			// Check if verification data is complete before proceeding
			if (!isVerificationComplete) {
				toast.error(
					"Please upload both verification video and ID before proceeding."
				);
				return;
			}

			setActiveTab("upload-portfolio");
		} else if (activeTab === "upload-portfolio") {
			// Check if portfolio video is complete before proceeding
			if (!isPortfolioComplete) {
				toast.error(
					"Please upload at least 3 portfolio videos before proceeding."
				);
				return;
			}
			setActiveTab("complete-profile");
		}
	};

	if (loading) {
		return <div className="container mx-auto py-8 px-4">Loading...</div>;
	}
	// Show loading state or return to login if not authenticated
	if (!currentUser) {
		return null;
	}

	return (
		<div className="container mx-auto py-8 px-4 lg:px-8 font-satoshi">
			<div className="flex flex-col md:flex-row">
				{/* Left sidebar with tabs */}
				<div className="w-full md:w-64 flex-shrink-0 mb-6 md:mb-0 md:mr-8">
					<div className="space-y-1">
						<button
							onClick={() => handleTabChange("upload-verification")}
							className={`w-full text-left py-2 px-3 rounded ${
								activeTab === "upload-verification"
									? "text-orange-500 underline pl-2"
									: "text-gray-600"
							}`}
						>
							Upload Verification Video
						</button>
						<button
							onClick={() => handleTabChange("upload-portfolio")}
							className={`w-full text-left py-2 px-3 rounded ${
								activeTab === "upload-portfolio"
									? "text-orange-500 underline pl-2"
									: "text-gray-600"
							}`}
							// Only allow going to portfolio tab if verification is complete
							disabled={!isVerificationComplete}
						>
							Upload Portfolio Videos
						</button>
						<button
							onClick={() => handleTabChange("complete-profile")}
							className={`w-full text-left py-2 px-3 rounded ${
								activeTab === "complete-profile"
									? "text-orange-500 underline pl-2"
									: "text-gray-600"
							}`}
							// Only allow going to profile tab if verification is complete
							disabled={!isVerificationComplete}
						>
							Complete Your Profile
						</button>
					</div>
				</div>

				{/* Right content area */}
				<div className="flex-1 max-w-3xl">
					

					{/* Content based on active tab */}
					<div>
						{activeTab === "upload-verification" ? (
							<UploadVerificationVideo />
						) : activeTab === "upload-portfolio" ? (
							<UploadPortfolioVideos />
						) : (
							<CreatorProfileForm />
						)}
					</div>

					{/* Next button - Show for verification and portfolio tabs */}
					{(activeTab === "upload-verification" || activeTab === "upload-portfolio") && (
						<div className="mt-8 flex justify-end mb-10">
							<Button
								onClick={handleNextClick}
								className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center"
								disabled={
									loading || 
									(activeTab === "upload-verification" && !isVerificationComplete) ||
									(activeTab === "upload-portfolio" && !isPortfolioComplete)
								}
							>
								{loading ? "Loading..." : "Next"}
								{!loading && <ArrowRight size={20} className="ml-2" />}
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// The main component that sets up the context
export default function VerifyIdentityPage() {
	const { currentUser } = useAuth();

	return (
		<CreatorVerificationProvider userId={currentUser?.uid}>
			<VerifyIdentityContent />
		</CreatorVerificationProvider>
	);
}
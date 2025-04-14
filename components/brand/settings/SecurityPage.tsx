"use client";

import { useState, useEffect } from "react";
import SecurityPrivacySettings from "./SecurityPrivacy";
import { useAuth } from "@/context/AuthContext";

export default function SecurityPage() {
	const { currentUser } = useAuth(); // Get the current user from your auth context
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Wait for auth to initialize
		if (currentUser !== undefined) {
			setIsLoading(false);
		}
	}, [currentUser]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				Loading ...
			</div>
		);
	}

	if (!currentUser) {
		// Redirect to login or show unauthorized message
		return (
			<div className="flex flex-col items-center justify-center h-full">
				<h2 className="text-xl font-bold mb-2">Unauthorized</h2>
				<p>Please login to access this page</p>
				<a
					href="/brand/login"
					className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition"
				>
					Go to Login
				</a>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8 max-w-3xl">
			<SecurityPrivacySettings userEmail={currentUser.email || ""} />
		</div>
	);
}

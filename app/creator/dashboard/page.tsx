"use client";

import { useState, useEffect } from "react";
import UserDashboard from "@/components/brand/brandProfile/dashboard/DashboardOverview";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/brand/brandProfile/ProtectedRoute";
import SideNavLayout from "@/components/Creators/dashboard/CreatorSideNavbar";
import CreatorContentWrapper from "@/components/Creators/dashboard/CreatorContentWrapper";

export default function DashboardPage() {
	const [isLoading, setIsLoading] = useState(true);
	const { currentUser } = useAuth();

	// Simply use the currentUser directly
	useEffect(() => {
		// Just need to set loading to false once we've confirmed auth state
		setIsLoading(false);
	}, [currentUser]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="w-8 h-8 border-t-2 border-b-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	if (!currentUser) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="text-gray-500">User not found. Please log in.</p>
			</div>
		);
	}

	return (
			<CreatorContentWrapper userId={currentUser.uid} pageType="dashboard">
				<SideNavLayout>
					<div className="p-6">
						<ProtectedRoute>
							<UserDashboard userId={currentUser.uid} />
						</ProtectedRoute>
					</div>
				</SideNavLayout>
			</CreatorContentWrapper>
	);
}

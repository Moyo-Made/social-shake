"use client";

import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/brand/brandProfile/ProtectedRoute";
import CreatorContentWrapper from "@/components/Creators/dashboard/CreatorContentWrapper";
import CreatorDashboard from "@/components/Creators/dashboard/CreatorDashboard";

export default function DashboardPage() {
	const { currentUser, isLoading } = useAuth();

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
		
			<div className="p-6">
				<ProtectedRoute>
					<CreatorDashboard userId={currentUser.uid} />
				</ProtectedRoute>
			</div>
		</CreatorContentWrapper>
	);
}

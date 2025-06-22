"use client";

import UserDashboard from "@/components/brand/brandProfile/dashboard/DashboardOverview";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/brand/brandProfile/ProtectedRoute";

export default function DashboardPage() {
	const { currentUser, isLoading } = useAuth();

	// Let the auth context handle all loading states
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
		<div className="p-6">
			<ProtectedRoute>
				<UserDashboard userId={currentUser.uid} />
			</ProtectedRoute>
		</div>
	);
}

"use client";

import ContestDashboard from "@/components/brand/brandProfile/dashboard/ViewContests/ContestDashboard";
import React from "react";

import { useAuth } from "@/context/AuthContext";

const Page = () => {
	const { currentUser } = useAuth();

	if (!currentUser) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="text-gray-500">User not found. Please log in.</p>
			</div>
		);
	}
	return (
			<ContestDashboard />
	);
};

export default Page;

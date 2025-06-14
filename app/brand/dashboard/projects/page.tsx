"use client"

import { ProjectFormProvider } from "@/components/brand/brandProjects/ProjectFormContext";
import ProjectDashboard from "@/components/brand/brandProjects/viewProject/ProjectDashboard";
import { useAuth } from "@/context/AuthContext";
import React from "react";

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
		<ProjectFormProvider>
					<ProjectDashboard />
		</ProjectFormProvider>
	);
};

export default Page;

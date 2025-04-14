"use client"

import BrandContentWrapper from "@/components/brand/brandProfile/BrandContentWrapper";
import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";
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
			<SideNavLayout>
				<BrandContentWrapper userId={currentUser.uid} pageType="projects">
					<ProjectDashboard />
				</BrandContentWrapper>
			</SideNavLayout>
		</ProjectFormProvider>
	);
};

export default Page;

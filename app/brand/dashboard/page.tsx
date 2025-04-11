"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import UserDashboard from "@/components/brand/brandProfile/dashboard/DashboardOverview";
import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";

export default function DashboardPage() {
	const [userId, setUserId] = useState<string | null>(null);
	const auth = getAuth();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (user) {
				// User is signed in
				setUserId(user.uid);
			} else {
				// User is signed out
				setUserId(null);
			}
		});

		// Cleanup subscription on unmount
		return () => unsubscribe();
	}, [auth]);

	if (!userId) {
		return (
			<div className="text-center p-8">
				<h2 className="text-xl font-semibold text-gray-700">
					Authentication Required
				</h2>
				<p className="text-gray-500 mt-2">
					Please log in to view your dashboard.
				</p>
			</div>
		);
	}

	return (
		<SideNavLayout>
			<div className="min-h-screen w-full">
				<main>
					<div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
						<UserDashboard userId={userId} />
					</div>
				</main>
			</div>
		</SideNavLayout>
	);
}

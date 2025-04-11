"use client";

import { NextPage } from "next";
import { useAuth } from "@/context/AuthContext";
import NotificationPreferences from "@/components/brand/settings/notification/NotificationsPreferences";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";

const NotificationsPage: NextPage = () => {
	const { user, loading } = useAuth();
	const router = useRouter();

	// Redirect if not authenticated
	useEffect(() => {
		if (!loading && !user) {
			router.push("/login?redirect=/account/notifications");
		}
	}, [user, loading, router]);

	if (loading) {
		return (
			<SideNavLayout>
				<div className="flex justify-center items-center h-64">
					<p>Loading...</p>
				</div>
			</SideNavLayout>
		);
	}

	if (!user) {
		return null; // Will redirect due to useEffect
	}

	return (
		<SideNavLayout>
			<div className="max-w-5xl mx-auto px-4 py-8">
				<NotificationPreferences />
			</div>
		</SideNavLayout>
	);
};

export default NotificationsPage;

import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";
import SideNavLayout from "@/components/admin/AdminSideNav";
import AdminDashboard from "@/components/admin/AdmnDashboard";
import React from "react";

export default function page() {
	return (
		<AdminProtectedRoute>
			<SideNavLayout>
				<AdminDashboard />
			</SideNavLayout>
		</AdminProtectedRoute>
	);
}

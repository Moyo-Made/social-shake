import EmptyContest from "@/components/dashboard/Contests";
import DashboardProtectedRoute from "@/components/ProtectedRoute";
import React from "react";

const page = () => {
	return (
		<DashboardProtectedRoute>
			<EmptyContest />
		</DashboardProtectedRoute>
	);
};

export default page;

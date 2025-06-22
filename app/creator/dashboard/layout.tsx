"use client";

import SideNavLayout from "@/components/Creators/dashboard/CreatorSideNavbar";
import { CreatorStatusProvider } from "@/context/CreatorStatusContext";
import { useAuth } from "@/context/AuthContext";

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const { currentUser, isLoading } = useAuth();

	// Show loading while checking auth
	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="w-8 h-8 border-t-2 border-b-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	// If no user, still show the layout (ProtectedRoute will handle auth)
	if (!currentUser) {
		return <SideNavLayout>{children}</SideNavLayout>;
	}

	// If user exists, wrap with CreatorStatusProvider
	return (
		<CreatorStatusProvider userId={currentUser.uid}>
			<SideNavLayout>{children}</SideNavLayout>
		</CreatorStatusProvider>
	);
}
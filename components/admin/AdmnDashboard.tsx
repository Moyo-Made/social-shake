"use client"

import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
	const { currentUser, logout } = useAuth();
	const router = useRouter();

	const handleLogout = async () => {
		await logout();
		router.push("/admin/login");
	};

	return (
		<AdminProtectedRoute>
			<div className="min-h-screen bg-gray-100">
				<nav className="bg-white shadow-sm">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="flex justify-between h-16">
							<div className="flex items-center">
								<h1 className="text-xl font-semibold">Admin Dashboard</h1>
							</div>
							<div className="flex items-center">
								<span className="mr-4 text-sm text-gray-500">
									{currentUser?.email}
								</span>
								<button
									onClick={handleLogout}
									className="px-3 py-1 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
								>
									Logout
								</button>
							</div>
						</div>
					</div>
				</nav>

				<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
						<div className="bg-white overflow-hidden shadow rounded-lg">
							<div className="px-4 py-5 sm:p-6">
								<h3 className="text-lg font-medium text-gray-900">
									Pending Brands
								</h3>
								<div className="mt-2 text-3xl font-semibold">0</div>
								<div className="mt-4">
									<Link
										href="/admin/brands/pending"
										className="text-sm font-medium text-blue-600 hover:text-blue-500"
									>
										View all
									</Link>
								</div>
							</div>
						</div>

						<div className="bg-white overflow-hidden shadow rounded-lg">
							<div className="px-4 py-5 sm:p-6">
								<h3 className="text-lg font-medium text-gray-900">
									Pending Contests
								</h3>
								<div className="mt-2 text-3xl font-semibold">0</div>
								<div className="mt-4">
									<Link
										href="/admin/contests/pending"
										className="text-sm font-medium text-blue-600 hover:text-blue-500"
									>
										View all
									</Link>
								</div>
							</div>
						</div>

						<div className="bg-white overflow-hidden shadow rounded-lg">
							<div className="px-4 py-5 sm:p-6">
								<h3 className="text-lg font-medium text-gray-900">
									Active Contests
								</h3>
								<div className="mt-2 text-3xl font-semibold">0</div>
								<div className="mt-4">
									<Link
										href="/admin/contests/active"
										className="text-sm font-medium text-blue-600 hover:text-blue-500"
									>
										View all
									</Link>
								</div>
							</div>
						</div>
					</div>
				</main>
			</div>
		</AdminProtectedRoute>
	);
}

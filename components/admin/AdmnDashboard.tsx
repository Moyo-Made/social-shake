"use client";

import Link from "next/link";

export default function AdminDashboard() {
	return (
		<div className="min-h-screen bg-gray-100">
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
	);
}

"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function NotFound() {


	return (
		<>
		<Navbar />
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-satoshi">
			<div className="max-w-md w-full space-y-8 text-center">
				<div>
					{/* 404 Icon */}
					<div className="mx-auto h-32 w-32 rounded-full bg-orange-100 flex items-center justify-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-16 w-16 text-orange-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>

					<h2 className="mt-6 text-center text-5xl font-extrabold text-gray-900">
						404
					</h2>
					<p className="mt-2 text-center text-3xl font-bold text-gray-900">
						Page Not Found
					</p>
					<p className="mt-2 text-center text-lg text-gray-600">
						We couldn&apos;t find the page you&apos;re looking for.
					</p>

				</div>

				<div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 justify-center">
					<Link
						href="/"
						className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
					>
						Go Home
					</Link>
				</div>
			</div>
		</div>
		<Footer />
		</>
	);
}

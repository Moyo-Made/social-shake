import { NextPage } from "next";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Payout from "./Payout";

const PayoutPage: NextPage = () => {
	const { currentUser, isLoading } = useAuth();
	const router = useRouter();

	// Redirect if not authenticated
	useEffect(() => {
		if (!isLoading && !currentUser) {
			router.push("/brand/login");
		}
	}, [currentUser, isLoading, router]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				Loading ...
			</div>
		);
	}

	return (
		<>
			<main className="min-h-screen bg-gray-50 py-12">
				<div className="container mx-auto px-4">
					<Payout />
				</div>
			</main>
		</>
	);
};

export default PayoutPage;

import { NextPage } from "next";
import Head from "next/head";
import BillingPayments from "@/components/brand/settings/billingPayments/BillingPayments";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const BillingPage: NextPage = () => {
	const { user, loading } = useAuth();
	const router = useRouter();

	// Redirect if not authenticated
	useEffect(() => {
		if (!loading && !user) {
			router.push("/login");
		}
	}, [user, loading, router]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
				Loading ...
			</div>
		);
	}

	return (
		<>
			<Head>
				<title>Billing & Payments | Your App</title>
				<meta
					name="description"
					content="Manage your billing and payment methods"
				/>
			</Head>

			<main className="min-h-screen bg-gray-50 py-12">
				<div className="container mx-auto px-4">
					<BillingPayments />
				</div>
			</main>
		</>
	);
};

export default BillingPage;

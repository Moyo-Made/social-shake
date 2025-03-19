"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
	ContestFormProvider,
	useContestForm,
} from "@/components/brandProfile/dashboard/newContest/ContestFormContext";
import EditContestForm from "@/components/brandProfile/dashboard/EditContests/EditContestForm";

export default function EditContestPage() {
	const params = useParams();
	const [userId, setUserId] = useState<string | null>(null);

	// Get contest ID from the URL
	const contestId = params?.contestId as string;

	// Fetch user ID on component mount (replace with your auth implementation)
	useEffect(() => {
		// This would be replaced with your actual auth logic
		// e.g. const user = auth.currentUser;
		// setUserId(user?.uid || null);

		// For now, we'll use a placeholder
		setUserId("test-user-id");
	}, []);

	if (!userId) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-orange-50">
				<p className="ml-2">Loading user information...</p>
			</div>
		);
	}

	return (
		<ContestFormProvider userId={userId}>
			<ContestEditor contestId={contestId} userId={userId} />
		</ContestFormProvider>
	);
}

// Separated component to use the contest form context
function ContestEditor({
	contestId,
	userId,
}: {
	contestId: string;
	userId: string;
}) {
	const router = useRouter();
	const { loadDraftData } = useContestForm();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchContest = async () => {
			try {
				setLoading(true);

				// Fetch the contest data from the API - pass both contestId and userId
				const response = await fetch(
					`/api/contests?contestId=${contestId}&userId=${userId}`
				);
				const result = await response.json();

				if (!response.ok) {
					throw new Error(result.error || "Failed to load contest");
				}

				if (result.success && result.data) {
					// Load the data into the form context
					loadDraftData(result.data);
					setLoading(false);
				} else {
					throw new Error("No contest data found");
				}
			} catch (err) {
				console.error("Error loading contest:", err);
				setError(err instanceof Error ? err.message : "Failed to load contest");
				setLoading(false);
			}
		};

		if (contestId) {
			fetchContest();
		} else {
			setError("No contest ID provided");
			setLoading(false);
		}
	}, [contestId, userId, loadDraftData]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="ml-2">Loading contest data...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen bg-orange-50">
				<div className="bg-white p-6 rounded-lg shadow-md">
					<h1 className="text-xl font-bold text-red-500 mb-4">Error</h1>
					<p className="mb-4">{error}</p>
					<button
						onClick={() => router.push("/dashboard")}
						className="bg-orange-500 text-white px-4 py-2 rounded-md"
					>
						Return to Dashboard
					</button>
				</div>
			</div>
		);
	}

	return <EditContestForm contestId={contestId} />;
}

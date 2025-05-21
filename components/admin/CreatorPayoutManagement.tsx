"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
	AlertCircle,
	CheckCircle,
	Clock,
	DollarSign,
	RefreshCw,
} from "lucide-react";
import { db } from "@/config/firebase";
import {
	doc,
	getDoc,
	collection,
	query,
	where,
	getDocs,
	orderBy,
} from "firebase/firestore";

type Winner = {
	userId: string;
	displayName: string;
	rank: number;
	prizeAmount: number;
	payoutStatus: "pending" | "processing" | "paid" | "failed";
	stripeConnected: boolean;
	payoutId?: string;
	failureReason?: string;
};

type ContestPayoutProps = {
	contestId: string;
};

export default function ContestPayoutManagement({
	contestId,
}: ContestPayoutProps) {
	type Contest = {
		title: string;
		status: string;
		prizeMoney: number;
		winnerCount: number;
		payoutStatus?: string;
	};

	const [contest, setContest] = useState<Contest | null>(null);
	const [winners, setWinners] = useState<Winner[]>([]);
	const [loading, setLoading] = useState(true);
	const [processingPayout, setProcessingPayout] = useState(false);

	useEffect(() => {
		const fetchContestAndWinners = async () => {
			try {
				setLoading(true);

				// Fetch contest data
				const contestRef = doc(db, "contests", contestId);
				const contestSnap = await getDoc(contestRef);

				if (contestSnap.exists()) {
					const contestData = contestSnap.data();
					const mappedContest: Contest = {
						title: contestData.title,
						status: contestData.status,
						prizeMoney: contestData.prizeMoney,
						winnerCount: contestData.winnerCount,
						payoutStatus: contestData.payoutStatus,
					};
					setContest(mappedContest);

					// Fetch winners based on leaderboard
					const leaderboardRef = collection(db, "contestLeaderboard");
					const winnersQuery = query(
						leaderboardRef,
						where("contestId", "==", contestId),
						where("rank", "<=", contestData.winnerCount || 3),
						orderBy("rank", "asc")
					);

					const winnersSnap = await getDocs(winnersQuery);
					const winnersData: Winner[] = [];

					// Process each winner
					for (const winnerDoc of winnersSnap.docs) {
						const winnerData = winnerDoc.data();

						// Get user details to check if they have Stripe connected
						const userRef = doc(db, "users", winnerData.userId);
						const userSnap = await getDoc(userRef);
						const userData = userSnap.exists() ? userSnap.data() : null;

						// Calculate prize amount based on rank and contest prize distribution
						let prizeAmount = 0;
						if (
							contestData.prizeMoney &&
							winnerData.rank <= contestData.winnerCount
						) {
							// Simple distribution logic - can be enhanced based on your requirements
							if (winnerData.rank === 1) {
								prizeAmount = contestData.prizeMoney * 0.5; // 50% to 1st place
							} else if (winnerData.rank === 2) {
								prizeAmount = contestData.prizeMoney * 0.3; // 30% to 2nd place
							} else {
								// Remaining 20% distributed equally among other winners
								const remainingWinners = contestData.winnerCount - 2;
								prizeAmount =
									remainingWinners > 0
										? (contestData.prizeMoney * 0.2) / remainingWinners
										: 0;
							}
						}

						winnersData.push({
							userId: winnerData.userId,
							displayName: userData?.displayName || winnerData.userId,
							rank: winnerData.rank,
							prizeAmount,
							payoutStatus: winnerData.payoutStatus || "pending",
							stripeConnected: !!userData?.stripeAccountId,
							payoutId: winnerData.payoutId,
							failureReason: winnerData.payoutFailureReason,
						});
					}

					setWinners(winnersData);
				}
			} catch (error) {
				console.error("Error fetching contest data:", error);
				toast("Failed to load contest payout information");
			} finally {
				setLoading(false);
			}
		};

		fetchContestAndWinners();
	}, [contestId]);

	const handleProcessPayouts = async () => {
		try {
			setProcessingPayout(true);

			const response = await fetch(`/api/contests/process-payouts`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ contestId }),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || "Failed to process payouts");
			}

			toast("Payouts processed successfully");

			// Refresh winner data
			const contestRef = doc(db, "contests", contestId);
			const contestSnap = await getDoc(contestRef);

			if (contestSnap.exists()) {
				const updatedWinners = [...winners];

				// Update payout statuses based on API response
				result.payouts.forEach(
					(payout: {
						userId: string;
						status: string;
						payoutId?: string;
						failureReason?: string;
					}) => {
						const winnerIndex = updatedWinners.findIndex(
							(w) => w.userId === payout.userId
						);
						if (winnerIndex !== -1) {
							updatedWinners[winnerIndex] = {
								...updatedWinners[winnerIndex],
								payoutStatus: [
									"pending",
									"processing",
									"paid",
									"failed",
								].includes(payout.status)
									? (payout.status as
											| "pending"
											| "processing"
											| "paid"
											| "failed")
									: "pending",
								payoutId: payout.payoutId,
								failureReason: payout.failureReason,
							};
						}
					}
				);

				setWinners(updatedWinners);
			}
		} catch (error) {
			console.error("Error processing payouts:", error);
			toast("Failed to process payouts");
		} finally {
			setProcessingPayout(false);
		}
	};

	const refreshPayoutStatus = async () => {
		try {
			setLoading(true);

			const response = await fetch(`/api/contests/check-payout-status`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ contestId }),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || "Failed to refresh payout status");
			}

			// Update the winners with fresh status
			const updatedWinners = [...winners];
			result.payouts.forEach(
				(payout: {
					userId: string;
					status: string;
					failureReason?: string;
				}) => {
					const winnerIndex = updatedWinners.findIndex(
						(w) => w.userId === payout.userId
					);
					if (winnerIndex !== -1) {
						updatedWinners[winnerIndex] = {
							...updatedWinners[winnerIndex],
							payoutStatus: payout.status as
								| "pending"
								| "processing"
								| "paid"
								| "failed",
							failureReason: payout.failureReason,
						};
					}
				}
			);

			setWinners(updatedWinners);

			toast("Payout statuses refreshed");
		} catch (error) {
			console.error("Error refreshing payout status:", error);
			toast("Failed to refresh payout status");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center p-8">
				Loading contest payout information...
			</div>
		);
	}

	if (!contest) {
		return <div className="text-center p-8">Contest not found</div>;
	}

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "paid":
				return (
					<Badge className="bg-green-500">
						<CheckCircle className="w-4 h-4 mr-1" /> Paid
					</Badge>
				);
			case "processing":
				return (
					<Badge className="bg-blue-500">
						<Clock className="w-4 h-4 mr-1" /> Processing
					</Badge>
				);
			case "failed":
				return (
					<Badge className="bg-red-500">
						<AlertCircle className="w-4 h-4 mr-1" /> Failed
					</Badge>
				);
			default:
				return (
					<Badge className="bg-gray-500">
						<Clock className="w-4 h-4 mr-1" /> Pending
					</Badge>
				);
		}
	};

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>Contest Payout Management</CardTitle>
				<CardDescription>
					Manage payouts for contest: {contest.title}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="mb-6">
					<h3 className="text-lg font-semibold mb-2">Contest Details</h3>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<p className="text-sm font-medium text-gray-500">Status</p>
							<p>{contest.status}</p>
						</div>
						<div>
							<p className="text-sm font-medium text-gray-500">Prize Pool</p>
							<p className="flex items-center">
								<DollarSign className="w-4 h-4" />{" "}
								{contest.prizeMoney?.toFixed(2)}
							</p>
						</div>
						<div>
							<p className="text-sm font-medium text-gray-500">Winner Count</p>
							<p>{contest.winnerCount}</p>
						</div>
						<div>
							<p className="text-sm font-medium text-gray-500">Payout Status</p>
							<p>{contest.payoutStatus || "Not processed"}</p>
						</div>
					</div>
				</div>

				<h3 className="text-lg font-semibold mb-2">Winner Payouts</h3>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Rank</TableHead>
							<TableHead>Creator</TableHead>
							<TableHead>Prize Amount</TableHead>
							<TableHead>Stripe Connected</TableHead>
							<TableHead>Payout Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{winners.length > 0 ? (
							winners.map((winner) => (
								<TableRow key={winner.userId}>
									<TableCell>#{winner.rank}</TableCell>
									<TableCell>{winner.displayName}</TableCell>
									<TableCell>${winner.prizeAmount.toFixed(2)}</TableCell>
									<TableCell>
										{winner.stripeConnected ? (
											<Badge className="bg-green-500">Connected</Badge>
										) : (
											<Badge className="bg-yellow-500">Not Connected</Badge>
										)}
									</TableCell>
									<TableCell>
										{getStatusBadge(winner.payoutStatus)}
										{winner.failureReason && (
											<div className="text-xs text-red-500 mt-1">
												{winner.failureReason}
											</div>
										)}
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={5} className="text-center">
									No winners found
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</CardContent>
			<CardFooter className="flex justify-between">
				<Button
					variant="outline"
					onClick={refreshPayoutStatus}
					disabled={loading}
				>
					<RefreshCw className="w-4 h-4 mr-2" />
					Refresh Status
				</Button>
				<Button
					onClick={handleProcessPayouts}
					disabled={
						processingPayout ||
						contest.payoutStatus === "completed" ||
						winners.every((w) => w.payoutStatus === "paid")
					}
				>
					<DollarSign className="w-4 h-4 mr-2" />
					Process Payouts
				</Button>
			</CardFooter>
		</Card>
	);
}

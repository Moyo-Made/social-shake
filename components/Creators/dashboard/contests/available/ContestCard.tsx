import React, { useEffect, useState } from "react";
import Image from "next/image";
import { formatDistance } from "date-fns";
import { ContestFormData } from "@/types/contestFormData";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface BrandProfile {
	id?: string;
	userId: string;
	email?: string;
	brandName: string;
	logoUrl: string;
}

interface ContestCardProps {
	contest: ContestFormData;
}

export const ContestCard: React.FC<ContestCardProps> = ({ contest }) => {
	const { contestId, basic, prizeTimeline, status, createdAt } = contest;
	const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
	const [, setBrandEmail] = useState<string>("");

	

	useEffect(() => {
		const fetchBrandProfile = async () => {
			if (!contest || !contest.userId) return;

			try {
				// Skip if we already have this brand profile
				if (brandProfile && brandProfile.userId === contest.userId) {
					return;
				}

				const response = await fetch(
					`/api/admin/brand-approval?userId=${contest.userId}`
				);

				if (response.ok) {
					const data = await response.json();
					setBrandProfile(data);
					if (data.email) {
						setBrandEmail(data.email);
					}
				} else {
					// Handle 404 or other errors by setting a placeholder
					setBrandProfile({
						id: contest.userId,
						userId: contest.userId,
						email: "Unknown",
						brandName: "Unknown Brand",
						logoUrl: "",
					});
				}
			} catch (error) {
				console.error(
					`Error fetching brand profile for userId ${contest.userId}:`,
					error
				);
			}
		};

		if (contest) {
			fetchBrandProfile();
		}
	}, [contest, brandProfile]);

	const getStatusBadge = () => {
		switch (status) {
			case "active":
				return (
					<Badge className="bg-[#ECFDF3] text-[#067647] border-[#ABEFC6] rounded-full py-1 font-normal">
						Open to All Creators
					</Badge>
				);
			case "review":
				return (
					<Badge className="bg-[#FFF0C3] text-[#1A1A1A] border-[#FDD849]">
						Application Required
					</Badge>
				);
			case "completed":
				return (
					<Badge className="bg-blue-100 text-blue-800 border-blue-800">
						Completed
					</Badge>
				);
			case "draft":
				return (
					<Badge className="bg-gray-100 text-gray-800 border-gray-800">
						Draft
					</Badge>
				);
			default:
				return null;
		}
	};

	const getTimeAgo = () => {
		try {
			return formatDistance(new Date(createdAt), new Date(), {
				addSuffix: true,
			});
		} catch {
			return "Recently";
		}
	};

	const truncateText = (text: string, maxLength: number) => {
		if (!text) return "";
		return text.length > maxLength
			? `${text.substring(0, maxLength)}...`
			: text;
	};

	return (
		<div className=" rounded-lg overflow-hidden border border-gray-200 bg-white hover:shadow-md transition-shadow">
			<div className="relative h-48 w-full">
				{basic.thumbnail ? (
					<Image
						src={basic.thumbnail as string}
						alt={basic.contestName}
						fill
						className="object-cover"
					/>
				) : (
					<div className="h-full w-full bg-gray-200 flex items-center justify-center">
						<p className="text-gray-500">No Image</p>
					</div>
				)}
				<div className="absolute top-4 left-4">{getStatusBadge()}</div>
			</div>

			<div className="p-3">
				<h3 className="text-base font-semibold mb-4">{basic.contestName}</h3>

				<div className="flex justify-between items-center mb-4">
					<div className="flex items-center">
						{brandProfile?.logoUrl ? (
							<Image
								className="h-8 w-8 rounded-full mr-2 object-cover"
								src={brandProfile.logoUrl}
								alt={brandProfile.brandName || "Brand"}
								width={32}
								height={32}
							/>
						) : (
							<div className="h-8 w-8 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
								<span className="text-xs text-gray-500">B</span>
							</div>
						)}

						<p className="text-sm font-medium">
							{brandProfile?.brandName || "Loading..."}
						</p>
					</div>
					<div className="">
						<p className="text-xs text-gray-500">
							Posted: <span className="text-black font-medium">{getTimeAgo()}</span>
						</p>
					</div>
				</div>

				<p className="text-sm text-gray-600 mb-4">
					{truncateText(basic.description, 150)}
				</p>

				<div className="border-t border-gray-200 pt-4 grid grid-cols-3 gap-2 text-sm">
					<div>
						<p className="text-orange-500">Contest Type</p>
						<p className="font-normal">{contest.contestType}</p>
					</div>

					<div>
						<p className="text-orange-500">Contest End Date</p>
						<p className="font-normal">
							{prizeTimeline.endDate
								? new Date(prizeTimeline.endDate).toLocaleDateString()
								: "Not set"}
						</p>
					</div>

					<div>
						<p className="text-orange-500">Creators Joined</p>
						<p className="font-normal">
							{contest.participantsCount || 0} Creators
						</p>
					</div>
				</div>

				<Link
					href={`/creator/dashboard/contest/${contestId}`}
					className="mt-4 block w-full text-center py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
				>
					{status === "draft" ? "Edit Contest" : "Join Contest"} {" "} &rarr;
				</Link>
			</div>
		</div>
	);
};

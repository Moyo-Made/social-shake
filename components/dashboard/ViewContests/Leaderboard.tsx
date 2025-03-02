import React from "react";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import CountdownTimer from "./CountdownTimer";

const Leaderboard = () => {
	// Mock data for top contestants
	const topContestants = [
		{
			id: 1,
			position: 1,
			fullName: "Colina Demirdjian",
			username: "Colina42rf",
			profileImage: "/icons/Colinaa.svg",
			badge: "/icons/Gold.svg",
			views: "20.2k",
			likes: "4.2k",
			comments: "200",
		},
		{
			id: 2,
			position: 2,
			fullName: "Tolulope Olu",
			username: "OlumipeWeb",
			profileImage: "/icons/Tolulope.svg",
			badge: "/icons/Silver.svg",
			views: "20.2k",
			likes: "4.2k",
			comments: "200",
		},
		{
			id: 3,
			position: 3,
			fullName: "Hripsime Demirdjian",
			username: "Hripsime54ge",
			profileImage: "/icons/Hripsime.svg",
			badge: "/icons/Bronze.svg",
			views: "20.2k",
			likes: "4.2k",
			comments: "200",
		},
	];

	// Mock data for leaderboard table
	const leaderboardData = Array(6).fill({
		position: "#4",
		username: "Colina42rf",
		fullName: "Colina Demirdjian",
		profileImage: "/icons/colina.svg",
		views: "12.5k",
		likes: "2.2k",
		comments: "500",
	});

	// Badge colors and backgrounds for top positions
	const positionStyles: {
		[key: number]: { cardBg: string; borderColor: string };
	} = {
		1: { cardBg: "#FBED7B", borderColor: "#FCD949" },
		2: { cardBg: "#EBF1F5", borderColor: "#B0C1D1" },
		3: { cardBg: "#F7E6D8", borderColor: "#CF9C69" },
	};

	 const contestEndDate = "2025-03-20T12:00:00"; 
// "2023-12-31T23:59:59Z"

	return (
		<div className="w-full max-w-4xl mx-auto">
			<CountdownTimer targetDate={contestEndDate}  />
			{/* Top 3 Cards Section */}
			<div className="flex flex-wrap justify-center gap-4 mb-6">
				{topContestants.map((contestant) => (
					<div
						key={contestant.id}
						className="w-72 border rounded-lg overflow-hidden"
						style={{
							borderColor: positionStyles[contestant.position].borderColor,
						}}
					>
						{/* Profile Image Section */}
						<div className="h-20  flex justify-center py-4 bg-white">
							<div className="relative h-20">
								<Image
									src={contestant.profileImage}
									alt={contestant.fullName}
									width={80}
									height={80}
									className="w-20 h-20 rounded-full object-cover"
								/>
								<div className="absolute -bottom-1 right-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-black border-2 border-white">
									<Image
										src={contestant.badge}
										alt={contestant.badge}
										width={30}
										height={30}
									/>
								</div>
							</div>
						</div>

						{/* Details Section */}
						<div
						className="pt-3"
							style={{
								backgroundColor: positionStyles[contestant.position].cardBg,
							}}
						>
							<div className="pt-3 pb-1 text-center">
								<h3 className="font-bold text-[#101828] text-lg">{contestant.fullName}</h3>
								<p className="text-sm text-[#667085]">{contestant.username}</p>
							</div>

							<div className="flex justify-between px-4 py-2 text-center">
								<div className="flex-1">
									<p className="text-sm text-[#667085]">Views</p>
									<p className="font-semibold text-[#101828]">{contestant.views}</p>
								</div>
								<div className="flex-1">
									<p className="text-sm text-[#667085]">Likes</p>
									<p className="font-semibold text-[#101828]">{contestant.likes}</p>
								</div>
								<div className="flex-1">
									<p className="text-sm text-[#667085]">Comments</p>
									<p className="font-semibold text-[#101828]">{contestant.comments}</p>
								</div>
							</div>
						</div>
						<div className="py-3 text-center border-t border-gray-200 mx-4">
							<button className="inline-flex items-center text-sm font-medium">
								View Post <ArrowRight size={16} className="ml-2" />
							</button>
						</div>
					</div>
				))}
			</div>

			{/* Leaderboard Table */}
			<div className="flex bg-gray-50 py-3 text-gray-600 text-sm font-medium border-b border-gray-200">
				<div className="flex-1 text-center">Position</div>
				<div className="flex-1 mr-5 text-center">Creator Username</div>
				<div className="flex-1 text-center">Creator Fullname</div>
				<div className="flex-1 text-center">TikTok Link</div>
				<div className="flex-1 text-center">Views</div>
				<div className="flex-1 text-center">Likes</div>
				<div className="flex-1 text-center">Comments</div>
			</div>

			{/* Table Rows */}
			{leaderboardData.map((item, index) => (
				<div
					key={index}
					className="flex py-3 items-center border-b border-gray-200 text-sm"
				>
					<div className="flex-1 text-center font-medium">{item.position}</div>
					<div className="flex-1 mr-5 flex justify-center items-center gap-2">
						<img
							src={item.profileImage}
							alt={item.username}
							className="w-8 h-8 rounded-full"
						/>
						<span className="underline font-medium">{item.username}</span>
					</div>
					<div className="flex-1 text-center">{item.fullName}</div>
					<div className="flex-1 text-center">
						<button className="text-orange-500 font-medium">View Post</button>
					</div>
					<div className="flex-1 text-center">{item.views}</div>
					<div className="flex-1 text-center">{item.likes}</div>
					<div className="flex-1 text-center">{item.comments}</div>
				</div>
			))}
		</div>
	);
};

export default Leaderboard;

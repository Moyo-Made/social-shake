"use client";

import React, { useState } from "react";
import { Check, Trash2, Plus, Edit } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface ActorProfileProps {
	onCreateNewActor: () => void;
}

const ActorProfile = ({ onCreateNewActor }: ActorProfileProps) => {
	const [isEditing, setIsEditing] = useState(false);
	const [actorData, setActorData] = useState({
		name: "Violet",
		creationDate: "28/05/2025",
		voiceEnabled: true,
		price: 30,
		earnings: 2000,
		isAvailable: true,
		totalUsages: 67
	});

	const handleDelete = () => {
		if (confirm("Are you sure you want to delete this AI Actor? This action cannot be undone.")) {
			// Handle deletion logic here
			console.log("Actor deleted");
			// After deletion, you might want to show the empty state again
			// or handle multiple actors scenario
		}
	};

	const handleEdit = () => {
		setIsEditing(!isEditing);
	};

	const handleSave = () => {
		setIsEditing(false);
		// Save logic here
		console.log("Changes saved", actorData);
	};

	const toggleAvailability = () => {
		setActorData(prev => ({ ...prev, isAvailable: !prev.isAvailable }));
	};

	return (
		<div className="min-h-screen bg-gray-50 p-4">
			<div className="max-w-4xl mx-auto">
				{/* Header with Create New Actor Button */}
				<div className="flex justify-between items-center mb-8">
					<div>
						<h1 className="text-2xl font-semibold text-gray-900">My AI Actors</h1>
						<p className="text-gray-600 mt-1">Manage your AI actor profiles and earnings</p>
					</div>
					<Button
						onClick={onCreateNewActor}
						className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md flex items-center gap-2 shadow-none transition-all duration-200 "
					>
						<Plus size={20} />
						Create New AI Actor
					</Button>
				</div>
				
				{/* Actor Profile Card */}
				<div className="bg-white rounded-2xl shadow-lg overflow-hidden">
					<div className="flex flex-col lg:flex-row">
						{/* Left side - Image */}
						<div className="lg:w-1/2 relative">
							<div className="">
								<Image 
									src="/images/avatar-selection.png"
									alt="AI Actor Violet"
									className="w-full h-full object-contain"
									width={400}
									height={600}
								/>
							</div>
							{/* Play button overlay */}
							{/* <div className="absolute bottom-6 left-6">
								<div className="flex items-center gap-3">
									<button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-12 h-12 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl">
										<Play size={16} className="ml-0.5" />
									</button>
									<div className="bg-black bg-opacity-50 text-white text-sm font-medium px-3 py-1 rounded-full">
										0:10
									</div>
								</div>
							</div> */}
							{/* Status Badge */}
							<div className="absolute top-6 right-6">
								<div className={`px-3 py-1 rounded-full text-sm font-medium ${
									actorData.isAvailable 
										? 'bg-green-100 text-green-800' 
										: 'bg-gray-100 text-gray-800'
								}`}>
									{actorData.isAvailable ? 'Available' : 'Unavailable'}
								</div>
							</div>
						</div>

						{/* Right side - Details */}
						<div className="lg:w-1/2 bg-gradient-to-br from-gray-900 to-black text-white p-8">
							<div className="space-y-6">
								{/* Header */}
								<div>
									<div className="text-orange-400 text-sm font-medium mb-2">AI ACTOR</div>
									{isEditing ? (
										<input
											type="text"
											value={actorData.name}
											onChange={(e) => setActorData(prev => ({ ...prev, name: e.target.value }))}
											className="text-3xl font-bold bg-transparent border-b-2 border-orange-500 text-white outline-none pb-1"
										/>
									) : (
										<h1 className="text-2xl font-semibold">{actorData.name}</h1>
									)}
								</div>

								{/* Stats Grid */}
								<div className="grid grid-cols-2 gap-6">
									{/* Creation Date */}
									<div>
										<div className="text-gray-400 text-sm mb-1">Created</div>
										<div className="text-white font-medium">{actorData.creationDate}</div>
									</div>

									{/* Voice */}
									<div>
										<div className="text-gray-400 text-sm mb-1">Voice</div>
										<div className="text-white font-medium">
											{actorData.voiceEnabled ? "Enabled" : "Disabled"}
										</div>
									</div>

									{/* Price */}
									<div>
										<div className="text-gray-400 text-sm mb-1">Price</div>
										{isEditing ? (
											<div className="flex items-center">
												<span className="text-white mr-1">$</span>
												<input
													type="number"
													value={actorData.price}
													onChange={(e) => setActorData(prev => ({ ...prev, price: parseInt(e.target.value) }))}
													className="bg-transparent border-b border-orange-500 text-white outline-none w-16"
												/>
												<span className="text-white ml-1 text-sm">/use</span>
											</div>
										) : (
											<div className="text-white font-medium">${actorData.price} per use</div>
										)}
									</div>

									{/* Total Usages */}
									<div>
										<div className="text-gray-400 text-sm mb-1">Total Uses</div>
										<div className="text-white font-medium">{actorData.totalUsages}</div>
									</div>
								</div>

								{/* Earnings - Highlighted */}
								<div className="bg-orange-500 bg-opacity-10 border border-orange-500 border-opacity-30 rounded-xl p-4">
									<div className="text-orange-400 text-sm mb-1">Total Earnings</div>
									<div className="text-white text-xl font-bold">${actorData.earnings.toLocaleString()}</div>
								</div>

								{/* License Type */}
								<div>
									<div className="text-gray-400 text-sm mb-1">License Type</div>
									<div className="text-white font-medium">Pay-per-use</div>
								</div>

								{/* Set Availability */}
								<div>
									<div className="text-gray-400 text-sm mb-2">Availability</div>
									<button
										onClick={toggleAvailability}
										className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
											actorData.isAvailable ? 'bg-orange-500' : 'bg-gray-600'
										}`}
									>
										<span
											className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
												actorData.isAvailable ? 'translate-x-5' : 'translate-x-1'
											}`}
										/>
									</button>
								</div>

								{/* Action Buttons */}
								<div className="flex gap-3 pt-6">
									<Button
										onClick={handleDelete}
										className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-md font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-none"
									>
										<Trash2 size={16} />
										Delete
									</Button>
									{isEditing ? (
										<Button
											onClick={handleSave}
											className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-none"
										>
											<Check size={16} />
											Save
										</Button>
									) : (
										<Button
											onClick={handleEdit}
											className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-md font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-none"
										>
											<Edit size={16} />
											Edit
										</Button>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default ActorProfile;
"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import React, { useState } from "react";
import CreateActorModal from "./CreateCustomActor";
import ActorProfile from "./ActorProfile";

export default function AIActorSection() {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [hasActor, setHasActor] = useState(false);

	const openModal = () => setIsModalOpen(true);
	const closeModal = () => setIsModalOpen(false);

	// Function to handle actor creation confirmation
	const handleActorCreated = () => {
		setHasActor(true);
		setIsModalOpen(false);
	};

	// Function to handle creating new actor (from ActorProfile)
	const handleCreateNewActor = () => {
		setHasActor(false);
		setIsModalOpen(true);
	};

	// If actor exists, show ActorProfile component
	if (hasActor) {
		return <ActorProfile onCreateNewActor={handleCreateNewActor} />;
	}

	return (
		<>
			<div className="min-h-screen bg-gray-50 flex items-center justify-center py-16 px-4">
				<div className="max-w-4xl mx-auto text-center">
					{/* AI Actor Image */}
					<div className="flex justify-center items-center mb-8 relative">
						<Image
							src="/images/ai-actor.svg"
							alt="AI Actor"
							width={500}
							height={700}
						/>
					</div>

					{/* Main Heading */}
					<h1 className="text-3xl font-bold text-gray-900 mb-4">
						No AI Actor Yet
					</h1>

					{/* Description */}
					<p className="text-base text-gray-600 mb-4 max-w-xl text-center mx-auto leading-relaxed">
						Turn your face and personality into a sellable AI Actor. Brands can
						license your avatar to create UGC videos — even when you&apos;re
						offline. It&apos;s like earning while you sleep.
					</p>

					{/* Feature Points */}
					<div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-4">
						<div className="flex items-center">
							<div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
							<span className="text-gray-700 font-medium">
								Sell your likeness to brands
							</span>
						</div>

						<div className="flex items-center">
							<div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
							<span className="text-gray-700 font-medium">Earn per usage</span>
						</div>
					</div>

					{/* Additional Feature Point */}
					<div className="flex justify-center items-center mb-6">
						<div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
						<span className="text-gray-700 font-medium">
							Fully personalized with your tone and voice
						</span>
					</div>

					{/* CTA Button */}
					<Button
						onClick={openModal}
						className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-10 py-4 rounded-md shadow-none transition-all duration-200 transform"
					>
						Create My AI Avatar +
					</Button>
				</div>
			</div>
			<CreateActorModal isOpen={isModalOpen} onClose={closeModal} onActorCreated={handleActorCreated} />
		</>
	);
}

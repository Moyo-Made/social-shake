import React from "react";
import {
	X,
	Edit3,
	User,
	Package,
	Clock,
	Target,
	MessageSquare,
	Video,
	Palette,
	FileText,
} from "lucide-react";
import { ScriptFormData } from "./ScriptInputForm";
import { ProjectBriefData } from "./ProjectFormBrief";
import { Button } from "@/components/ui/button";

interface OrderSummaryModalProps {
	isOpen: boolean;
	onClose: () => void;
	onBack: () => void;
	onOrderConfirm: () => void;
	packageType: string;
	videoCount: number;
	totalPrice: number;
	creatorName: string;
	scriptChoice: "brand-written" | "creator-written";
	scriptFormData: ScriptFormData;
	projectBriefData: ProjectBriefData;
	onEditStep?: (step: "script" | "brief") => void;
}

const OrderSummaryModal: React.FC<OrderSummaryModalProps> = ({
	isOpen,
	onClose,
	onBack,
	onOrderConfirm,
	packageType,
	videoCount,
	totalPrice,
	creatorName,
	scriptChoice,
	scriptFormData,
	projectBriefData,
	onEditStep,
}) => {
	if (!isOpen) return null;

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const InfoRow = ({
		label,
		value,
		icon: Icon,
	}: {
		label: string;
		value: string;
		icon?: React.ElementType;
	}) => {
		if (!value) return null;
		return (
			<div className="flex items-start gap-3 py-2">
				{Icon && (
					<Icon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
				)}
				<div className="flex-1 min-w-0">
					<span className="text-sm font-medium text-gray-700">{label}:</span>
					<p className="text-sm text-gray-600 mt-1 break-words">{value}</p>
				</div>
			</div>
		);
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
					<div>
						<h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
						<p className="text-gray-600 mt-1">
							Review your project details before confirmation
						</p>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-white/50 rounded-full transition-colors"
					>
						<X className="w-6 h-6 text-gray-500" />
					</button>
				</div>

				{/* Step Indicator */}
				<div className="mt-6 mx-6">
						<div className="flex items-center">
							<div className="flex flex-col items-center text-green-600">
								<div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
									✓
								</div>
								<span className="ml-2 text-xs font-medium">
									Script Approach
								</span>
							</div>
							<div className=" h-px bg-gray-300 flex-1"></div>
							<div className="flex flex-col justify-center items-center text-green-600">
								<div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
									✓
								</div>
								<span className="ml-2 text-sm font-medium">
									Scripts & Details
								</span>
							</div>
							<div className="mx-4 h-px bg-gray-300 flex-1"></div>
							<div className="flex items-center text-green-600">
								<div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
								✓
								</div>
								<span className="ml-2 text-sm font-medium">Project Brief</span>
							</div>
							<div className="mx-4 h-px bg-gray-300 flex-1"></div>
							<div className="flex items-center text-orange-600">
								<div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm">
									4
								</div>
								<span className="ml-2 text-sm">Review</span>
							</div>
						</div>
					</div>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto">
					<div className="p-6 space-y-8">
						{/* Package Overview */}
						<div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
							<div className="flex items-center gap-3 mb-6">
								<div className="p-2 bg-blue-100 rounded-lg">
									<Package className="w-5 h-5 text-blue-600" />
								</div>
								<h3 className="text-xl font-semibold text-gray-900">
									Package Details
								</h3>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
								<div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
									<User className="w-6 h-6 text-blue-600 mx-auto mb-3" />
									<p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Creator</p>
									<p className="font-semibold text-gray-900">{creatorName}</p>
								</div>
								<div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
									<Package className="w-6 h-6 text-purple-600 mx-auto mb-3" />
									<p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Package</p>
									<p className="font-semibold text-gray-900 capitalize">
										{packageType}
									</p>
								</div>
								<div className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
									<Video className="w-6 h-6 text-indigo-600 mx-auto mb-3" />
									<p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Videos</p>
									<p className="font-semibold text-gray-900">{videoCount}</p>
								</div>
								<div className="text-center p-4 bg-white rounded-xl shadow-sm border border-green-100 hover:shadow-md transition-shadow">
									<div className="w-6 h-6 text-green-600 mx-auto mb-3 font-bold text-xl">
										$
									</div>
									<p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total</p>
									<p className="font-bold text-green-600 text-lg">
										{formatCurrency(totalPrice)}
									</p>
								</div>
							</div>
							<div className="mt-6 p-4 bg-white rounded-xl border border-gray-100">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-gray-700">Script Type:</span>
									<span className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 rounded-full text-sm font-medium capitalize border border-blue-200">
										{scriptChoice.replace("-", " ")}
									</span>
								</div>
							</div>
						</div>

						{/* Script Details */}
						<div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
							<div className="flex items-center justify-between mb-6">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-purple-100 rounded-lg">
										<FileText className="w-5 h-5 text-purple-600" />
									</div>
									<h3 className="text-xl font-semibold text-gray-900">
										{scriptChoice === "brand-written"
											? "Brand Scripts & Requirements"
											: "Creative Brief"}
									</h3>
								</div>
								{onEditStep && (
									<button
										onClick={() => onEditStep("script")}
										className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
									>
										<Edit3 className="w-4 h-4" />
										Edit
									</button>
								)}
							</div>

							{scriptChoice === "brand-written" &&
								scriptFormData.scripts.length > 0 && (
									<div className="mb-6">
										<h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
											<div className="w-1 h-5 bg-purple-500 rounded-full"></div>
											Scripts
										</h4>
										<div className="space-y-4">
											{scriptFormData.scripts.map((script, index) => (
												<div key={index} className="bg-gray-50 rounded-xl p-5 border border-gray-200">
													<div className="flex items-center gap-3 mb-3">
														<span className="w-7 h-7 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
															{index + 1}
														</span>
														<h5 className="font-medium text-gray-900">
															{script.title || `Video ${index + 1}`}
														</h5>
													</div>
													{script.script && (
														<div className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
															<p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
																{script.script}
															</p>
														</div>
													)}
													{script.notes && (
														<div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3 border border-blue-100">
															<strong className="text-blue-800">Notes:</strong> {script.notes}
														</div>
													)}
												</div>
											))}
										</div>
									</div>
								)}

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-4">
									<InfoRow
										label="Target Audience"
										value={scriptFormData.generalRequirements.targetAudience}
										icon={Target}
									/>
									<InfoRow
										label="Brand Voice"
										value={scriptFormData.generalRequirements.brandVoice}
										icon={MessageSquare}
									/>
									<InfoRow
										label="Call to Action"
										value={scriptFormData.generalRequirements.callToAction}
										icon={Target}
									/>
								</div>
								<div className="space-y-4">
									<InfoRow
										label="Key Messages"
										value={scriptFormData.generalRequirements.keyMessages}
										icon={MessageSquare}
									/>
									<InfoRow
										label="Style Preferences"
										value={scriptFormData.generalRequirements.stylePreferences}
										icon={Palette}
									/>
									<InfoRow
										label="Additional Notes"
										value={scriptFormData.generalRequirements.additionalNotes}
										icon={FileText}
									/>
								</div>
							</div>
						</div>

						{/* Project Specifications */}
						<div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
							<div className="flex items-center justify-between mb-6">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-green-100 rounded-lg">
										<Video className="w-5 h-5 text-green-600" />
									</div>
									<h3 className="text-xl font-semibold text-gray-900">
										Project Specifications
									</h3>
								</div>
								{onEditStep && (
									<button
										onClick={() => onEditStep("brief")}
										className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
									>
										<Edit3 className="w-4 h-4" />
										Edit
									</button>
								)}
							</div>

							{/* Project Overview */}
							<div className="mb-8">
								<h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-3">
									<div className="w-1 h-5 bg-blue-500 rounded-full"></div>
									<Target className="w-5 h-5 text-blue-600" />
									Project Overview
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-4">
										<InfoRow
											label="Project Goal"
											value={projectBriefData.projectOverview.projectGoal}
										/>
										<InfoRow
											label="Target Audience"
											value={projectBriefData.projectOverview.targetAudience}
										/>
									</div>
									<div className="space-y-4">
										<InfoRow
											label="Key Messages"
											value={projectBriefData.projectOverview.keyMessages}
										/>
										<InfoRow
											label="Brand Background"
											value={projectBriefData.projectOverview.brandBackground}
										/>
									</div>
								</div>
							</div>

							{/* Content Requirements */}
							<div className="mb-8">
								<h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-3">
									<div className="w-1 h-5 bg-purple-500 rounded-full"></div>
									<MessageSquare className="w-5 h-5 text-purple-600" />
									Content Requirements
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-4">
										<InfoRow
											label="Content Type"
											value={projectBriefData.contentRequirements.contentType}
										/>
										<InfoRow
											label="Tone & Style"
											value={projectBriefData.contentRequirements.toneAndStyle}
										/>
										<InfoRow
											label="Call to Action"
											value={projectBriefData.contentRequirements.callToAction}
										/>
									</div>
									<div className="space-y-4">
										<InfoRow
											label="Must Include"
											value={projectBriefData.contentRequirements.mustInclude}
										/>
										<InfoRow
											label="Must Avoid"
											value={projectBriefData.contentRequirements.mustAvoid}
										/>
										<InfoRow
											label="Competitor Examples"
											value={
												projectBriefData.contentRequirements.competitorExamples
											}
										/>
									</div>
								</div>
							</div>

							{/* Video Specifications */}
							<div className="mb-8">
								<h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-3">
									<div className="w-1 h-5 bg-green-500 rounded-full"></div>
									<Video className="w-5 h-5 text-green-600" />
									Video Specifications
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
									<div className="bg-green-50 rounded-xl p-4 border border-green-200">
										<p className="text-xs text-green-600 uppercase tracking-wide mb-2">Duration</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.videoSpecs.duration}
										</p>
									</div>
									<div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
										<p className="text-xs text-blue-600 uppercase tracking-wide mb-2">Format</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.videoSpecs.format}
										</p>
									</div>
									<div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
										<p className="text-xs text-purple-600 uppercase tracking-wide mb-2">
											Delivery Format
										</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.videoSpecs.deliveryFormat}
										</p>
									</div>
									<div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
										<p className="text-xs text-indigo-600 uppercase tracking-wide mb-2">
											Script Approval
										</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.videoSpecs.scriptApproval}
										</p>
									</div>
								</div>
							</div>

							{/* Timeline */}
							<div>
								<h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-3">
									<div className="w-1 h-5 bg-orange-500 rounded-full"></div>
									<Clock className="w-5 h-5 text-orange-600" />
									Timeline & Delivery
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
									<div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
										<p className="text-xs text-orange-600 uppercase tracking-wide mb-2">
											Script Deadline
										</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.timeline.scriptDeadline}
										</p>
									</div>
									<div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
										<p className="text-xs text-orange-600 uppercase tracking-wide mb-2">
											Revision Rounds
										</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.timeline.revisionRounds}
										</p>
									</div>
									<div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
										<p className="text-xs text-orange-600 uppercase tracking-wide mb-2">
											Final Deadline
										</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.timeline.finalDeadline}
										</p>
									</div>
									<div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
										<p className="text-xs text-orange-600 uppercase tracking-wide mb-2">Urgency</p>
										<p className="font-semibold text-gray-900">
											{projectBriefData.timeline.urgency}
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Cost Breakdown */}
						<div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
							<div className="flex items-center gap-3 mb-6">
								<div className="p-2 bg-green-100 rounded-lg">
									<div className="w-5 h-5 text-green-600 font-bold text-lg flex items-center justify-center">$</div>
								</div>
								<h3 className="text-lg font-semibold text-gray-900">
									Cost Breakdown
								</h3>
							</div>
							<div className="space-y-4">
								<div className="flex justify-between items-center py-3 px-4 bg-white rounded-lg border border-green-100">
									<span className=" text-gray-700 font-medium">
										{videoCount} × {packageType.charAt(0).toUpperCase() + packageType.slice(1)} Videos
									</span>
									<span className="font-semibold text-gray-900 text-base">
										{formatCurrency(totalPrice)}
									</span>
								</div>
								<div className="border-t border-green-200 pt-4">
									<div className="flex justify-between items-center px-4">
										<span className="text-base font-bold text-gray-900">
											Total Amount
										</span>
										<span className="text-lg font-bold text-green-600">
											{formatCurrency(totalPrice)}
										</span>
									</div>
									<div className="mt-3 p-4 bg-white rounded-lg border border-green-100">
										<p className="text-sm text-gray-600 flex items-center gap-2">
											<div className="w-2 h-2 bg-green-500 rounded-full"></div>
											Payment will be held in escrow until project completion
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Fixed Footer */}
				<div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
					<button
						onClick={onBack}
						className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
					>
						← Back
					</button>
					<div className="flex items-center gap-6">
						<p className="text-sm text-gray-600 max-w-xs">
							By confirming, you agree to our terms and conditions
						</p>
						<Button
							onClick={onOrderConfirm}
							className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all duration-200 font-semibold transform "
						>
							Confirm Order →
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default OrderSummaryModal;
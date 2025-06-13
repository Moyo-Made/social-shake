import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface ScriptInputFormProps {
	isOpen: boolean;
	onClose: () => void;
	onBack: () => void;
	packageType: string;
	videoCount: number;
	totalPrice: number;
	creatorName: string;
	onScriptsComplete: (scriptData: ScriptFormData) => void;
	scriptChoice: "brand-written" | "creator-written";
}

export interface ScriptData {
	script: string;
	title: string;
	notes: string;
}

export interface ScriptFormData {
	scripts: ScriptData[];
	generalRequirements: {
		targetAudience: string;
		brandVoice: string;
		callToAction: string;
		keyMessages: string;
		stylePreferences: string;
		additionalNotes: string;
	};
	videoSpecs: {
		duration: string;
		format: string;
		deliveryFormat: string;
	};
}

const ScriptInputForm: React.FC<ScriptInputFormProps> = ({
	isOpen,
	onClose,
	onBack,
	packageType,
	videoCount,
	totalPrice,
	creatorName,
	onScriptsComplete,
	scriptChoice,
}) => {
	const [formData, setFormData] = useState<ScriptFormData>({
		scripts: Array.from({ length: videoCount }, () => ({
			script: "",
			title: "",
			notes: "",
		})),
		generalRequirements: {
			targetAudience: "",
			brandVoice: "",
			callToAction: "",
			keyMessages: "",
			stylePreferences: "",
			additionalNotes: "",
		},
		videoSpecs: {
			duration: "",
			format: "",
			deliveryFormat: "",
		},
	});

	const [activeTab, setActiveTab] = useState<
		"scripts" | "requirements" | "specs"
	>("scripts");
	const [currentScriptIndex, setCurrentScriptIndex] = useState(0);

	useEffect(() => {
		if (!formData.scripts || formData.scripts.length !== videoCount) {
			setFormData((prev) => ({
				...prev,
				scripts: Array.from({ length: videoCount }, () => ({
					script: "",
					title: "",
					notes: "",
				})),
			}));
		}
	}, [videoCount]);

	if (!isOpen) return null;

	const getPackageDisplayName = () => {
		switch (packageType) {
			case "one":
				return "1 Video";
			case "three":
				return "3 Videos";
			case "five":
				return "5 Videos";
			case "bulk":
				return "Bulk Videos";
			default:
				return `${videoCount} Videos`;
		}
	};

	const updateScript = (
		index: number,
		field: keyof ScriptData,
		value: string
	) => {
		setFormData((prev) => ({
			...prev,
			scripts: prev.scripts.map((script, i) =>
				i === index ? { ...script, [field]: value } : script
			),
		}));
	};

	const updateRequirements = (
		field: keyof ScriptFormData["generalRequirements"],
		value: string
	) => {
		setFormData((prev) => ({
			...prev,
			generalRequirements: {
				...prev.generalRequirements,
				[field]: value,
			},
		}));
	};

	const updateSpecs = (
		field: keyof ScriptFormData["videoSpecs"],
		value: string
	) => {
		setFormData((prev) => ({
			...prev,
			videoSpecs: {
				...prev.videoSpecs,
				[field]: value,
			},
		}));
	};

	const isFormValid = () => {
		// Check if all scripts have content
		const scriptsValid = formData.scripts.every(
			(script) =>
				script.script.trim().length > 0 && script.title.trim().length > 0
		);

		// Check if required fields are filled
		const requirementsValid =
			formData.generalRequirements.targetAudience.trim().length > 0 &&
			formData.generalRequirements.callToAction.trim().length > 0;

		const specsValid =
			formData.videoSpecs.duration && formData.videoSpecs.format;

		return scriptsValid && requirementsValid && specsValid;
	};

	const handleContinue = () => {
		if (isFormValid()) {
			onScriptsComplete(formData);
		}
	};

	const getCompletionStatus = () => {
		const scriptsComplete = formData.scripts.every(
			(script) =>
				script.script.trim().length > 0 && script.title.trim().length > 0
		);
		const requirementsComplete =
			formData.generalRequirements.targetAudience.trim().length > 0 &&
			formData.generalRequirements.callToAction.trim().length > 0;
		const specsComplete =
			formData.videoSpecs.duration && formData.videoSpecs.format;

		return { scriptsComplete, requirementsComplete, specsComplete };
	};

	const { scriptsComplete, requirementsComplete, specsComplete } =
		getCompletionStatus();

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="border-b border-gray-200 p-6">
					<div className="flex justify-between items-start">
						<div>
							<h2 className="text-xl font-semibold text-gray-900">
								Provide Your Scripts
							</h2>
							<p className="text-sm text-gray-600 mt-1">
								{getPackageDisplayName()} with {creatorName} • ${totalPrice}
							</p>
						</div>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 text-2xl"
						>
							×
						</button>
					</div>

					{/* Step Indicator */}
					<div className="mt-6">
						<div className="flex items-center">
							<div className="flex items-center text-green-600">
								<div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
									✓
								</div>
								<span className="ml-2 text-sm font-medium">
									Script Approach
								</span>
							</div>
							<div className="mx-4 h-px bg-gray-300 flex-1"></div>
							<div className="flex items-center text-orange-600">
								<div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
									2
								</div>
								<span className="ml-2 text-sm font-medium">
									Scripts & Details
								</span>
							</div>
							<div className="mx-4 h-px bg-gray-300 flex-1"></div>
							<div className="flex items-center text-gray-400">
								<div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm">
									3
								</div>
								<span className="ml-2 text-sm">Project Brief</span>
							</div>
							<div className="mx-4 h-px bg-gray-300 flex-1"></div>
							<div className="flex items-center text-gray-400">
								<div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-sm">
									4
								</div>
								<span className="ml-2 text-sm">Review</span>
							</div>
						</div>
					</div>

					{/* Tab Navigation */}
					<div className="mt-6">
						<div className="flex space-x-8 border-b border-gray-200">
							<button
								onClick={() => setActiveTab("scripts")}
								className={`py-2 px-1 border-b-2 font-medium text-sm ${
									activeTab === "scripts"
										? "border-orange-500 text-orange-600"
										: "border-transparent text-gray-500 hover:text-gray-700"
								}`}
							>
								Scripts {scriptsComplete && "✓"}
							</button>
							<button
								onClick={() => setActiveTab("requirements")}
								className={`py-2 px-1 border-b-2 font-medium text-sm ${
									activeTab === "requirements"
										? "border-orange-500 text-orange-600"
										: "border-transparent text-gray-500 hover:text-gray-700"
								}`}
							>
								Requirements {requirementsComplete && "✓"}
							</button>
							<button
								onClick={() => setActiveTab("specs")}
								className={`py-2 px-1 border-b-2 font-medium text-sm ${
									activeTab === "specs"
										? "border-orange-500 text-orange-600"
										: "border-transparent text-gray-500 hover:text-gray-700"
								}`}
							>
								Video Specs {specsComplete && "✓"}
							</button>
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="p-6">
					{/* Scripts Tab */}
					{activeTab === "scripts" && (
						<div>
							<div className="mb-6">
								<h3 className="text-lg font-medium text-gray-900 mb-2">
									{scriptChoice === "brand-written"
										? "Your Video Scripts"
										: "Script Brief for Creator"}
								</h3>
								<p className="text-gray-600 text-sm">
									{scriptChoice === "brand-written"
										? "Provide the complete script for each video. Include dialogue, actions, and any specific instructions."
										: "Provide a brief description of what you want for each video. The creator will write the full scripts based on your brief."}
								</p>
							</div>

							{/* Script Navigation */}
							{videoCount > 1 && (
								<div className="mb-6">
									<div className="flex space-x-2">
										{formData.scripts.map((_, index) => (
											<button
												key={index}
												onClick={() => setCurrentScriptIndex(index)}
												className={`px-4 py-2 text-sm font-medium rounded-lg ${
													currentScriptIndex === index
														? "bg-orange-100 text-orange-700 border border-orange-300"
														: "bg-gray-100 text-gray-600 hover:bg-gray-200"
												}`}
											>
												Video {index + 1}
												{formData.scripts[index].script &&
													formData.scripts[index].title &&
													" ✓"}
											</button>
										))}
									</div>
								</div>
							)}

							{/* Current Script Form */}
							<div className="space-y-4">
								<div>
									<Label className="block text-sm font-medium text-gray-700 mb-2">
										Video Title *
									</Label>
									<Input
										type="text"
										value={formData.scripts[currentScriptIndex].title}
										onChange={(e) =>
											updateScript(currentScriptIndex, "title", e.target.value)
										}
										placeholder="Enter a descriptive title for this video"
										className="w-full p-3 border border-gray-300 rounded-lg"
									/>
								</div>

								<div>
									<Label className="block text-sm font-medium text-gray-700 mb-2">
										{scriptChoice === "brand-written"
											? "Complete Script *"
											: "Video Brief *"}
									</Label>
									<Textarea
										value={formData.scripts[currentScriptIndex].script}
										onChange={(e) =>
											updateScript(currentScriptIndex, "script", e.target.value)
										}
										placeholder={
											scriptChoice === "brand-written"
												? "Enter the complete script including dialogue, actions, and instructions..."
												: "Describe what you want in this video - key points, style, call-to-action, etc. The creator will write the full script..."
										}
										rows={scriptChoice === "brand-written" ? 12 : 6}
										className="w-full p-3 border border-gray-300 rounded-lg "
									/>
								</div>

								<div>
									<Label className="block text-sm font-medium text-gray-700 mb-2">
										Additional Notes
									</Label>
									<Textarea
										value={formData.scripts[currentScriptIndex].notes}
										onChange={(e) =>
											updateScript(currentScriptIndex, "notes", e.target.value)
										}
										placeholder="Any specific instructions, props needed, or additional context for this video..."
										rows={3}
										className="w-full p-3 border border-gray-300 rounded-lg "
									/>
								</div>
							</div>
						</div>
					)}

					{/* Requirements Tab */}
					{activeTab === "requirements" && (
						<div>
							<div className="mb-6">
								<h3 className="text-lg font-medium text-gray-900 mb-2">
									General Requirements
								</h3>
								<p className="text-gray-600 text-sm">
									Provide context and requirements that apply to all videos in
									this package.
								</p>
							</div>

							<div className="space-y-6">
								<div>
									<Label className="block text-sm font-medium text-gray-700 mb-2">
										Target Audience *
									</Label>
									<Textarea
										value={formData.generalRequirements.targetAudience}
										onChange={(e) =>
											updateRequirements("targetAudience", e.target.value)
										}
										placeholder="Describe your target audience (age, interests, demographics, pain points)..."
										rows={3}
										className="w-full p-3 border border-gray-300 rounded-lg "
									/>
								</div>

								<div>
									<Label className="block text-sm font-medium text-gray-700 mb-2">
										Brand Voice & Tone
									</Label>
									<Textarea
										value={formData.generalRequirements.brandVoice}
										onChange={(e) =>
											updateRequirements("brandVoice", e.target.value)
										}
										placeholder="Describe your brand's voice and tone (professional, casual, energetic, etc.)..."
										rows={3}
										className="w-full p-3 border border-gray-300 rounded-lg"
									/>
								</div>

								<div>
									<Label className="block text-sm font-medium text-gray-700 mb-2">
										Call-to-Action *
									</Label>
									<Textarea
										value={formData.generalRequirements.callToAction}
										onChange={(e) =>
											updateRequirements("callToAction", e.target.value)
										}
										placeholder="What action should viewers take? (visit website, use promo code, follow account, etc.)..."
										rows={2}
										className="w-full p-3 border border-gray-300 rounded-lg "
									/>
								</div>

								<div>
									<Label className="block text-sm font-medium text-gray-700 mb-2">
										Key Messages
									</Label>
									<Textarea
										value={formData.generalRequirements.keyMessages}
										onChange={(e) =>
											updateRequirements("keyMessages", e.target.value)
										}
										placeholder="What are the main points you want to communicate across all videos?..."
										rows={3}
										className="w-full p-3 border border-gray-300 rounded-lg"
									/>
								</div>

								<div>
									<Label className="block text-sm font-medium text-gray-700 mb-2">
										Style Preferences
									</Label>
									<Textarea
										value={formData.generalRequirements.stylePreferences}
										onChange={(e) =>
											updateRequirements("stylePreferences", e.target.value)
										}
										placeholder="Visual style, editing preferences, music style, pacing, etc...."
										rows={3}
										className="w-full p-3 border border-gray-300 rounded-lg "
									/>
								</div>

								<div>
									<Label className="block text-sm font-medium text-gray-700 mb-2">
										Additional Notes
									</Label>
									<Textarea
										value={formData.generalRequirements.additionalNotes}
										onChange={(e) =>
											updateRequirements("additionalNotes", e.target.value)
										}
										placeholder="Any other important information or requirements..."
										rows={3}
										className="w-full p-3 border border-gray-300 rounded-lg "
									/>
								</div>
							</div>
						</div>
					)}

					{/* Specs Tab */}
					{activeTab === "specs" && (
						<div>
							<div className="mb-6">
								<h3 className="text-lg font-medium text-gray-900 mb-2">
									Video Specifications
								</h3>
								<p className="text-gray-600 text-sm">
									Specify technical requirements for your videos.
								</p>
							</div>

							<div className="space-y-6">
								<div>
									<Label className="block text-sm font-medium text-gray-700 mb-2">
										Video Duration *
									</Label>
									<Select
										value={formData.videoSpecs.duration}
										onValueChange={(value) => updateSpecs("duration", value)}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select duration" />
										</SelectTrigger>
										<SelectContent className="bg-white">
											<SelectItem value="15-30s">15-30 seconds</SelectItem>
											<SelectItem value="30-60s">30-60 seconds</SelectItem>
											<SelectItem value="60-90s">60-90 seconds</SelectItem>
											<SelectItem value="90-120s">90-120 seconds</SelectItem>
											<SelectItem value="custom">
												Custom (specify in notes)
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label className="block text-sm font-medium text-gray-700 mb-2">
										Video Format *
									</Label>
									<Select
										value={formData.videoSpecs.format}
										onValueChange={(value) => updateSpecs("format", value)}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select format" />
										</SelectTrigger>
										<SelectContent className="bg-white">
											<SelectItem value="vertical">
												Vertical (9:16) - TikTok, Instagram Stories
											</SelectItem>
											<SelectItem value="square">
												Square (1:1) - Instagram Feed
											</SelectItem>
											<SelectItem value="horizontal">
												Horizontal (16:9) - YouTube, Facebook
											</SelectItem>
											<SelectItem value="multiple">
												Multiple formats needed
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label className="block text-sm font-medium text-gray-700 mb-2">
										Delivery Format
									</Label>
									<Select
										value={formData.videoSpecs.deliveryFormat}
										onValueChange={(value) =>
											updateSpecs("deliveryFormat", value)
										}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select delivery format" />
										</SelectTrigger>
										<SelectContent className="bg-white">
											<SelectItem value="mp4-hd">MP4 (HD 1080p)</SelectItem>
											<SelectItem value="mp4-4k">MP4 (4K)</SelectItem>
											<SelectItem value="mov-hd">MOV (HD 1080p)</SelectItem>
											<SelectItem value="mov-4k">MOV (4K)</SelectItem>
											<SelectItem value="multiple">Multiple formats</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="border-t border-gray-200 p-6">
					<div className="flex justify-between">
						<Button onClick={onBack} variant="outline" className="px-6">
							Back
						</Button>

						{/* Center - Tab navigation */}
						<div className="flex items-center space-x-3">
							{/* Previous Tab Button */}
							{(activeTab === "requirements" || activeTab === "specs") && (
								<Button
									onClick={() => {
										if (activeTab === "requirements") setActiveTab("scripts");
										if (activeTab === "specs") setActiveTab("requirements");
									}}
									variant="outline"
									size="default"
									className="px-4"
								>
									← Previous
								</Button>
							)}

							{/* Next Tab Button */}
							{(activeTab === "scripts" || activeTab === "requirements") && (
								<Button
									onClick={() => {
										if (activeTab === "scripts") setActiveTab("requirements");
										if (activeTab === "requirements") setActiveTab("specs");
									}}
									variant="outline"
									size="default"
									className="px-4"
								>
									Next →
								</Button>
							)}
						</div>

						<Button
							onClick={handleContinue}
							disabled={!isFormValid()}
							className="bg-orange-500 hover:bg-orange-600 text-white px-6 disabled:bg-gray-300"
						>
							Continue to Project Brief
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ScriptInputForm;

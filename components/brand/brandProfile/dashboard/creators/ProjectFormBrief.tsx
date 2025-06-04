import React, { useState } from "react";
import { Button } from "@/components/ui/button";

interface ProjectBriefFormProps {
	isOpen: boolean;
	onClose: () => void;
	onBack: () => void;
	packageType: string;
	videoCount: number;
	totalPrice: number;
	creatorName: string;
	onBriefComplete: (briefData: ProjectBriefData) => void;
}

export interface ProjectBriefData {
	projectOverview: {
		projectGoal: string;
		targetAudience: string;
		keyMessages: string;
		brandBackground: string;
	};
	contentRequirements: {
		contentType: string;
		toneAndStyle: string;
		callToAction: string;
		mustInclude: string;
		mustAvoid: string;
		competitorExamples: string;
	};
	brandGuidelines: {
		brandVoice: string;
		visualStyle: string;
		brandAssets: string;
		logoUsage: string;
		colorPreferences: string;
	};
	videoSpecs: {
		duration: string;
		format: string;
		deliveryFormat: string;
		scriptApproval: string;
	};
	examples: {
		preferredVideos: string;
		styleReferences: string;
		avoidExamples: string;
	};
	timeline: {
		scriptDeadline: string;
		revisionRounds: string;
		finalDeadline: string;
		urgency: string;
	};
}

const ProjectBriefForm: React.FC<ProjectBriefFormProps> = ({
	isOpen,
	onClose,
	onBack,
	packageType,
	videoCount,
	totalPrice,
	creatorName,
	onBriefComplete,
}) => {
	const [formData, setFormData] = useState<ProjectBriefData>({
		projectOverview: {
			projectGoal: "",
			targetAudience: "",
			keyMessages: "",
			brandBackground: "",
		},
		contentRequirements: {
			contentType: "",
			toneAndStyle: "",
			callToAction: "",
			mustInclude: "",
			mustAvoid: "",
			competitorExamples: "",
		},
		brandGuidelines: {
			brandVoice: "",
			visualStyle: "",
			brandAssets: "",
			logoUsage: "",
			colorPreferences: "",
		},
		videoSpecs: {
			duration: "",
			format: "",
			deliveryFormat: "",
			scriptApproval: "required",
		},
		examples: {
			preferredVideos: "",
			styleReferences: "",
			avoidExamples: "",
		},
		timeline: {
			scriptDeadline: "",
			revisionRounds: "2",
			finalDeadline: "",
			urgency: "standard",
		},
	});

	const [activeTab, setActiveTab] = useState<
		"overview" | "content" | "brand" | "specs" | "examples" | "timeline"
	>("overview");

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

	const updateSection = (
		section: keyof ProjectBriefData,
		field: string,
		value: string
	) => {
		setFormData((prev) => ({
			...prev,
			[section]: {
				...prev[section],
				[field]: value,
			},
		}));
	};

	const isFormValid = () => {
		// Check required fields
		const overviewValid =
			formData.projectOverview.projectGoal.trim().length > 0 &&
			formData.projectOverview.targetAudience.trim().length > 0 &&
			formData.projectOverview.keyMessages.trim().length > 0;

		const contentValid =
			formData.contentRequirements.toneAndStyle.trim().length > 0 &&
			formData.contentRequirements.callToAction.trim().length > 0;

		const specsValid =
			formData.videoSpecs.duration && formData.videoSpecs.format;

		return overviewValid && contentValid && specsValid;
	};

	const handleContinue = () => {
		if (isFormValid()) {
			onBriefComplete(formData);
		}
	};

	const getTabCompletionStatus = () => {
		const overviewComplete =
			formData.projectOverview.projectGoal.trim().length > 0 &&
			formData.projectOverview.targetAudience.trim().length > 0 &&
			formData.projectOverview.keyMessages.trim().length > 0;

		const contentComplete =
			formData.contentRequirements.toneAndStyle.trim().length > 0 &&
			formData.contentRequirements.callToAction.trim().length > 0;

		const brandComplete = formData.brandGuidelines.brandVoice.trim().length > 0;

		const specsComplete =
			formData.videoSpecs.duration && formData.videoSpecs.format;

		const examplesComplete =
			formData.examples.preferredVideos.trim().length > 0;

		const timelineComplete =
			formData.timeline.scriptDeadline && formData.timeline.finalDeadline;

		return {
			overviewComplete,
			contentComplete,
			brandComplete,
			specsComplete,
			examplesComplete,
			timelineComplete,
		};
	};

	const {
		overviewComplete,
		contentComplete,
		brandComplete,
		specsComplete,
		examplesComplete,
		timelineComplete,
	} = getTabCompletionStatus();

	const renderOverviewTab = () => (
		<div className="space-y-6">
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Project Goal *
				</label>
				<textarea
					value={formData.projectOverview.projectGoal}
					onChange={(e) =>
						updateSection("projectOverview", "projectGoal", e.target.value)
					}
					placeholder="What is the main objective of this video project? (e.g., increase brand awareness, drive sales, educate audience)"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
					rows={3}
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Target Audience *
				</label>
				<textarea
					value={formData.projectOverview.targetAudience}
					onChange={(e) =>
						updateSection("projectOverview", "targetAudience", e.target.value)
					}
					placeholder="Describe your ideal viewer (age, interests, demographics, pain points, platform behavior)"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
					rows={3}
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Key Messages *
				</label>
				<textarea
					value={formData.projectOverview.keyMessages}
					onChange={(e) =>
						updateSection("projectOverview", "keyMessages", e.target.value)
					}
					placeholder="What are the 2-3 main points you want viewers to remember?"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
					rows={3}
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Brand Background
				</label>
				<textarea
					value={formData.projectOverview.brandBackground}
					onChange={(e) =>
						updateSection("projectOverview", "brandBackground", e.target.value)
					}
					placeholder="Tell us about your brand, company culture, values, and what makes you unique"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
					rows={3}
				/>
			</div>
		</div>
	);

	const renderContentTab = () => (
		<div className="space-y-6">
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Content Type
				</label>
				<select
					value={formData.contentRequirements.contentType}
					onChange={(e) =>
						updateSection("contentRequirements", "contentType", e.target.value)
					}
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
				>
					<option value="">Select content type</option>
					<option value="product-demo">Product Demonstration</option>
					<option value="testimonial">Customer Testimonial</option>
					<option value="educational">Educational/How-to</option>
					<option value="brand-story">Brand Story</option>
					<option value="promotional">Promotional</option>
					<option value="explainer">Explainer Video</option>
					<option value="social-media">Social Media Content</option>
					<option value="other">Other</option>
				</select>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Tone & Style *
				</label>
				<textarea
					value={formData.contentRequirements.toneAndStyle}
					onChange={(e) =>
						updateSection("contentRequirements", "toneAndStyle", e.target.value)
					}
					placeholder="How should the video feel? (e.g., professional, casual, energetic, calm, humorous, serious)"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
					rows={3}
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Call to Action *
				</label>
				<input
					type="text"
					value={formData.contentRequirements.callToAction}
					onChange={(e) =>
						updateSection("contentRequirements", "callToAction", e.target.value)
					}
					placeholder="What action should viewers take? (e.g., visit website, subscribe, buy now)"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Must Include
				</label>
				<textarea
					value={formData.contentRequirements.mustInclude}
					onChange={(e) =>
						updateSection("contentRequirements", "mustInclude", e.target.value)
					}
					placeholder="Specific elements, features, or messages that must be included"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
					rows={3}
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Must Avoid
				</label>
				<textarea
					value={formData.contentRequirements.mustAvoid}
					onChange={(e) =>
						updateSection("contentRequirements", "mustAvoid", e.target.value)
					}
					placeholder="Topics, styles, or approaches to avoid"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
					rows={3}
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Competitor Examples
				</label>
				<textarea
					value={formData.contentRequirements.competitorExamples}
					onChange={(e) =>
						updateSection(
							"contentRequirements",
							"competitorExamples",
							e.target.value
						)
					}
					placeholder="Links to competitor videos or describe what they're doing that you like/dislike"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
					rows={3}
				/>
			</div>
		</div>
	);

	const renderBrandTab = () => (
		<div className="space-y-6">
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Brand Voice
				</label>
				<textarea
					value={formData.brandGuidelines.brandVoice}
					onChange={(e) =>
						updateSection("brandGuidelines", "brandVoice", e.target.value)
					}
					placeholder="How does your brand communicate? (e.g., friendly, authoritative, playful, sophisticated)"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
					rows={3}
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Visual Style
				</label>
				<textarea
					value={formData.brandGuidelines.visualStyle}
					onChange={(e) =>
						updateSection("brandGuidelines", "visualStyle", e.target.value)
					}
					placeholder="Describe your preferred visual aesthetic (modern, minimalist, bold, colorful, etc.)"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
					rows={3}
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Brand Assets
				</label>
				<textarea
					value={formData.brandGuidelines.brandAssets}
					onChange={(e) =>
						updateSection("brandGuidelines", "brandAssets", e.target.value)
					}
					placeholder="List available brand assets (logos, graphics, fonts, product images, etc.) and how to access them"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
					rows={3}
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Logo Usage
				</label>
				<textarea
					value={formData.brandGuidelines.logoUsage}
					onChange={(e) =>
						updateSection("brandGuidelines", "logoUsage", e.target.value)
					}
					placeholder="How should the logo be displayed? Any specific requirements or restrictions?"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
					rows={2}
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Color Preferences
				</label>
				<input
					type="text"
					value={formData.brandGuidelines.colorPreferences}
					onChange={(e) =>
						updateSection("brandGuidelines", "colorPreferences", e.target.value)
					}
					placeholder="Brand colors, hex codes, or color palette preferences"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
				/>
			</div>
		</div>
	);

	const renderSpecsTab = () => (
		<div className="space-y-6">
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Duration *
				</label>
				<select
					value={formData.videoSpecs.duration}
					onChange={(e) =>
						updateSection("videoSpecs", "duration", e.target.value)
					}
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
				>
					<option value="">Select duration</option>
					<option value="15-30s">15-30 seconds</option>
					<option value="30-60s">30-60 seconds</option>
					<option value="1-2min">1-2 minutes</option>
					<option value="2-5min">2-5 minutes</option>
					<option value="5-10min">5-10 minutes</option>
					<option value="10min+">10+ minutes</option>
					<option value="flexible">Flexible</option>
				</select>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Format *
				</label>
				<select
					value={formData.videoSpecs.format}
					onChange={(e) =>
						updateSection("videoSpecs", "format", e.target.value)
					}
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
				>
					<option value="">Select format</option>
					<option value="horizontal">Horizontal (16:9)</option>
					<option value="vertical">Vertical (9:16)</option>
					<option value="square">Square (1:1)</option>
					<option value="multiple">Multiple formats needed</option>
				</select>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Delivery Format
				</label>
				<select
					value={formData.videoSpecs.deliveryFormat}
					onChange={(e) =>
						updateSection("videoSpecs", "deliveryFormat", e.target.value)
					}
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
				>
					<option value="">Select delivery format</option>
					<option value="mp4-1080p">MP4 - 1080p</option>
					<option value="mp4-4k">MP4 - 4K</option>
					<option value="mov-prores">MOV - ProRes</option>
					<option value="multiple">Multiple formats</option>
					<option value="platform-optimized">Platform optimized</option>
				</select>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Script Approval
				</label>
				<select
					value={formData.videoSpecs.scriptApproval}
					onChange={(e) =>
						updateSection("videoSpecs", "scriptApproval", e.target.value)
					}
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
				>
					<option value="required">Approval required before filming</option>
					<option value="review">Review preferred but not required</option>
					<option value="not-required">Not required</option>
				</select>
			</div>
		</div>
	);

	const renderExamplesTab = () => (
		<div className="space-y-6">
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Preferred Videos
				</label>
				<textarea
					value={formData.examples.preferredVideos}
					onChange={(e) =>
						updateSection("examples", "preferredVideos", e.target.value)
					}
					placeholder="Share links to videos you love - style, tone, pacing, or approach you'd like to emulate"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
					rows={4}
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Style References
				</label>
				<textarea
					value={formData.examples.styleReferences}
					onChange={(e) =>
						updateSection("examples", "styleReferences", e.target.value)
					}
					placeholder="Any other visual or stylistic references (photography, design, other creators)"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
					rows={3}
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Examples to Avoid
				</label>
				<textarea
					value={formData.examples.avoidExamples}
					onChange={(e) =>
						updateSection("examples", "avoidExamples", e.target.value)
					}
					placeholder="Links to videos or styles you don't want - helps us understand what to avoid"
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
					rows={3}
				/>
			</div>
		</div>
	);

	const renderTimelineTab = () => (
		<div className="space-y-6">
			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Script Deadline
				</label>
				<input
					type="date"
					value={formData.timeline.scriptDeadline}
					onChange={(e) =>
						updateSection("timeline", "scriptDeadline", e.target.value)
					}
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Revision Rounds
				</label>
				<select
					value={formData.timeline.revisionRounds}
					onChange={(e) =>
						updateSection("timeline", "revisionRounds", e.target.value)
					}
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
				>
					<option value="1">1 revision round</option>
					<option value="2">2 revision rounds</option>
					<option value="3">3 revision rounds</option>
					<option value="unlimited">Unlimited (within reason)</option>
				</select>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Final Deadline
				</label>
				<input
					type="date"
					value={formData.timeline.finalDeadline}
					onChange={(e) =>
						updateSection("timeline", "finalDeadline", e.target.value)
					}
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-gray-700 mb-2">
					Urgency Level
				</label>
				<select
					value={formData.timeline.urgency}
					onChange={(e) => updateSection("timeline", "urgency", e.target.value)}
					className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
				>
					<option value="standard">Standard timeline</option>
					<option value="expedited">Expedited (+20% rush fee)</option>
					<option value="urgent">Urgent (+50% rush fee)</option>
				</select>
			</div>
		</div>
	);

	const renderActiveTab = () => {
		switch (activeTab) {
			case "overview":
				return renderOverviewTab();
			case "content":
				return renderContentTab();
			case "brand":
				return renderBrandTab();
			case "specs":
				return renderSpecsTab();
			case "examples":
				return renderExamplesTab();
			case "timeline":
				return renderTimelineTab();
			default:
				return renderOverviewTab();
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="border-b border-gray-200 p-6">
					<div className="flex justify-between items-start">
						<div>
							<h2 className="text-xl font-semibold text-gray-900">
								Project Brief for {creatorName}
							</h2>
							<p className="text-sm text-gray-600 mt-1">
								{getPackageDisplayName()} • ${totalPrice}
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
							<div className="flex items-center text-green-600">
								<div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
									✓
								</div>
								<span className="ml-2 text-sm font-medium">
									Scripts & Details
								</span>
							</div>
							<div className="mx-4 h-px bg-gray-300 flex-1"></div>
							<div className="flex items-center text-orange-600">
								<div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
									3
								</div>
								<span className="ml-2 text-sm font-medium">Project Brief</span>
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
						<div className="flex space-x-4 border-b border-gray-200 overflow-x-auto">
							<button
								onClick={() => setActiveTab("overview")}
								className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
									activeTab === "overview"
										? "border-orange-500 text-orange-600"
										: "border-transparent text-gray-500 hover:text-gray-700"
								}`}
							>
								Overview {overviewComplete && "✓"}
							</button>
							<button
								onClick={() => setActiveTab("content")}
								className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
									activeTab === "content"
										? "border-orange-500 text-orange-600"
										: "border-transparent text-gray-500 hover:text-gray-700"
								}`}
							>
								Content {contentComplete && "✓"}
							</button>
							<button
								onClick={() => setActiveTab("brand")}
								className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
									activeTab === "brand"
										? "border-orange-500 text-orange-600"
										: "border-transparent text-gray-500 hover:text-gray-700"
								}`}
							>
								Brand {brandComplete && "✓"}
							</button>
							<button
								onClick={() => setActiveTab("specs")}
								className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
									activeTab === "specs"
										? "border-orange-500 text-orange-600"
										: "border-transparent text-gray-500 hover:text-gray-700"
								}`}
							>
								Specs {specsComplete && "✓"}
							</button>
							<button
								onClick={() => setActiveTab("examples")}
								className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
									activeTab === "examples"
										? "border-orange-500 text-orange-600"
										: "border-transparent text-gray-500 hover:text-gray-700"
								}`}
							>
								Examples {examplesComplete && "✓"}
							</button>
							<button
								onClick={() => setActiveTab("timeline")}
								className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
									activeTab === "timeline"
										? "border-orange-500 text-orange-600"
										: "border-transparent text-gray-500 hover:text-gray-700"
								}`}
							>
								Timeline {timelineComplete && "✓"}
							</button>
						</div>
					</div>
				</div>

				{/* Form Content */}
				<div className="p-6">{renderActiveTab()}</div>

				{/* Footer */}
				<div className="border-t border-gray-200 p-6">
					<div className="flex justify-between items-center">
						<Button onClick={onBack} variant="outline" className="px-6 py-2">
							Back to Script Approach
						</Button>

						<div className="flex items-center space-x-3">
							<div className="text-sm text-gray-600">
								{isFormValid()
									? "Ready to continue"
									: "Complete required fields to continue"}
							</div>
							<Button
								onClick={handleContinue}
								disabled={!isFormValid()}
								className={`px-6 py-2 ${
									isFormValid()
										? "bg-orange-600 hover:bg-orange-700 text-white"
										: "bg-gray-300 text-gray-500 cursor-not-allowed"
								}`}
							>
								Continue to Review
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ProjectBriefForm;

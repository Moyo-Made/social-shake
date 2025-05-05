import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";

interface NotificationSetting {
	id: string;
	title: string;
	description: string;
	enabled: boolean;
}

export default function NotificationPreferences() {
	const { currentUser } = useAuth();
	const [settings, setSettings] = useState<NotificationSetting[]>([
		{
			id: "project_invites",
			title: "New Project Invites",
			description: "When brands invites you to their campaign",
			enabled: true,
		},
		{
			id: "payment_received",
			title: "Payment Received",
			description: "When you receive a payment from a brand",
			enabled: true,
		},
		{
			id: "content_approval",
			title: "Content Approval",
			description: "When brands approves your submitted content",
			enabled: true,
		},
		{
			id: "content_review",
			title: "Content Review",
			description: "When brands request changes to your content",
			enabled: true,
		},
		{
			id: "content_results",
			title: "Content Results",
			description: "When results are announced for contests you've entered",
			enabled: true,
		},
		{
			id: "platform_updates",
			title: "Platform Updates",
			description: "News and updates about Social Shake",
			enabled: false,
		},
		{
			id: "weekly_digest",
			title: "Weekly Digest",
			description: "Weekly summary of your activity and opportunities",
			enabled: false,
		},
	]);

	const [dashboardSettings, setDashboardSettings] = useState<
		NotificationSetting[]
	>([
		{
			id: "brand_messages",
			title: "Brand Messages",
			description: "When brands send you messages",
			enabled: true,
		},
		{
			id: "payout_status",
			title: "Payout Status Updates",
			description: "When your payment status changes",
			enabled: true,
		},
		{
			id: "campaign_milestone_reminders",
			title: "Campaign Milestone Reminders",
			description: "Reminders about upcoming deadlines",
			enabled: true,
		},
		{
			id: "content_feedback",
			title: "Content Feedback",
			description: "When brands leave feedback on your content",
			enabled: true,
		},
	]);
	const [isSaving, setIsSaving] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	// Fetch current notification settings
	useEffect(() => {
		async function fetchSettings() {
			if (!currentUser) return;

			try {
				const userDocRef = doc(db, "users", currentUser.uid);
				const userDoc = await getDoc(userDocRef);

				if (userDoc.exists() && userDoc.data().notificationSettings) {
					const userSettings = userDoc.data().notificationSettings;

					// Update local state with user's saved preferences
					setSettings((prev) =>
						prev.map((setting) => ({
							...setting,
							enabled:
								userSettings[setting.id] !== undefined
									? userSettings[setting.id]
									: setting.enabled,
						}))
					);
					setDashboardSettings((prev) =>
						prev.map((setting) => ({
							...setting,
							enabled:
								userSettings[setting.id] !== undefined
									? userSettings[setting.id]
									: setting.enabled,
						}))
					);
				}
				setIsLoading(false);
			} catch (error) {
				console.error("Error fetching notification settings:", error);
				setIsLoading(false);
			}
		}

		fetchSettings();
	}, [currentUser]);

	const toggleSetting = (id: string) => {
		setSettings((prev) =>
			prev.map((setting) =>
				setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
			)
		);
	};

	const savePreferences = async () => {
		if (!currentUser) return;

		setIsSaving(true);

		try {
			const userDocRef = doc(db, "users", currentUser.uid);

			// Convert settings array to object for storage
			const settingsObj = settings.reduce(
				(acc, setting) => {
					acc[setting.id] = setting.enabled;
					return acc;
				},
				{} as Record<string, boolean>
			);

			await updateDoc(userDocRef, {
				notificationSettings: settingsObj,
				updatedAt: new Date(),
			});

			setIsSaving(false);
		} catch (error) {
			console.error("Error saving notification preferences:", error);
			setIsSaving(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex flex-col justify-center items-center h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				Loading notification preferences...
			</div>
		);
	}

	return (
		<div className="bg-white border border-[#FFD9C3] rounded-lg shadow-md p-6  max-w-3xl mx-auto">
			<h2 className="text-xl font-medium mb-1">Notifications Settings</h2>
			<p className="text-gray-500 mb-2">
				Control which alerts you receive via email and in your dashboard
			</p>
			<hr className="my-4" />
			<h2 className="text-lg font-medium ">Email Notifications</h2>
			<p className="text-gray-500 mb-6">Manage emails from Social Shake</p>
			<div className="space-y-6">
				{settings.map((setting) => (
					<div key={setting.id} className="flex items-center justify-between">
						<div>
							<h3 className="font-medium text-base">{setting.title}</h3>
							<p className="text-gray-500">{setting.description}</p>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								className="sr-only peer"
								checked={setting.enabled}
								onChange={() => toggleSetting(setting.id)}
							/>
							<div
								className={`w-10 h-5 rounded-full relative transition-colors duration-200 ease-in-out
    ${setting.enabled ? "bg-orange-500" : "bg-gray-200"}
    after:content-[''] after:absolute after:top-0.5 after:left-0.5
    after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
    ${setting.enabled ? "after:translate-x-5" : ""}`}
							></div>
						</label>
					</div>
				))}
			</div>

			{/* Dashboard Settings */}
			<hr className="my-4" />
			<h2 className="text-lg font-medium ">Dashboard Alerts</h2>
			<p className="text-gray-500 mb-6">
				Notifications displayed in your dashboard
			</p>
			<div className="space-y-6">
				{dashboardSettings.map((dashboardSetting) => (
					<div
						key={dashboardSetting.id}
						className="flex items-center justify-between"
					>
						<div>
							<h3 className="font-medium text-base">
								{dashboardSetting.title}
							</h3>
							<p className="text-gray-500">{dashboardSetting.description}</p>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								className="sr-only peer"
								checked={dashboardSetting.enabled}
								onChange={() => toggleSetting(dashboardSetting.id)}
							/>
							<div
								className={`w-10 h-5 rounded-full relative transition-colors duration-200 ease-in-out
    ${dashboardSetting.enabled ? "bg-orange-500" : "bg-gray-200"}
    after:content-[''] after:absolute after:top-0.5 after:left-0.5
    after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
    ${dashboardSetting.enabled ? "after:translate-x-5" : ""}`}
							></div>
						</label>
					</div>
				))}
			</div>

			<div className="mt-8 flex justify-end">
				<button
					onClick={savePreferences}
					disabled={isSaving}
					className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
				>
					{isSaving ? "Saving..." : "Save Preferences"}
				</button>
			</div>
		</div>
	);
}

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface NotificationSetting {
	id: string;
	title: string;
	description: string;
	enabled: boolean;
}

const defaultEmailSettings: NotificationSetting[] = [
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
];

const defaultDashboardSettings: NotificationSetting[] = [
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
];

// Fetch notification settings from Firestore
const fetchNotificationSettings = async (userId: string) => {
	const userDocRef = doc(db, "users", userId);
	const userDoc = await getDoc(userDocRef);
	
	if (userDoc.exists() && userDoc.data().notificationSettings) {
		return userDoc.data().notificationSettings as Record<string, boolean>;
	}
	
	return {};
};

// Save notification settings to Firestore
const saveNotificationSettings = async (userId: string, settings: Record<string, boolean>) => {
	const userDocRef = doc(db, "users", userId);
	
	await updateDoc(userDocRef, {
		notificationSettings: settings,
		updatedAt: new Date(),
	});
};

// Helper function to merge default settings with user preferences
const mergeSettingsWithDefaults = (
	defaultSettings: NotificationSetting[],
	userSettings: Record<string, boolean>
): NotificationSetting[] => {
	return defaultSettings.map((setting) => ({
		...setting,
		enabled: userSettings[setting.id] !== undefined 
			? userSettings[setting.id] 
			: setting.enabled,
	}));
};

export default function NotificationPreferences() {
	const { currentUser } = useAuth();
	const queryClient = useQueryClient();
	
	// Local state for managing settings before saving
	const [localEmailSettings, setLocalEmailSettings] = useState<NotificationSetting[]>(defaultEmailSettings);
	const [localDashboardSettings, setLocalDashboardSettings] = useState<NotificationSetting[]>(defaultDashboardSettings);

	// Query for fetching notification settings
	const {
		data: userSettings,
		isLoading,
		error,
	} = useQuery<Record<string, boolean>, Error>({
		queryKey: ['notificationSettings', currentUser?.uid],
		queryFn: () => fetchNotificationSettings(currentUser!.uid),
		enabled: !!currentUser,
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: 2,
	});

	// Mutation for saving notification settings
	const savePreferencesMutation = useMutation<void, Error, Record<string, boolean>>({
		mutationFn: (settings: Record<string, boolean>) => 
			saveNotificationSettings(currentUser!.uid, settings),
		onSuccess: () => {
			// Invalidate and refetch the notification settings
			queryClient.invalidateQueries({ queryKey: ['notificationSettings', currentUser?.uid] });
		},
		onError: (error) => {
			console.error("Error saving notification preferences:", error);
			// You could add a toast notification here for better UX
		},
	});

	// Update local state when user settings are loaded
	useEffect(() => {
		if (userSettings) {
			setLocalEmailSettings(mergeSettingsWithDefaults(defaultEmailSettings, userSettings));
			setLocalDashboardSettings(mergeSettingsWithDefaults(defaultDashboardSettings, userSettings));
		}
	}, [userSettings]);

	const toggleEmailSetting = (id: string) => {
		setLocalEmailSettings((prev) =>
			prev.map((setting) =>
				setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
			)
		);
	};

	const toggleDashboardSetting = (id: string) => {
		setLocalDashboardSettings((prev) =>
			prev.map((setting) =>
				setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
			)
		);
	};

	const savePreferences = async () => {
		if (!currentUser) return;

		// Combine all settings into a single object
		const allSettings = [
			...localEmailSettings,
			...localDashboardSettings,
		].reduce(
			(acc, setting) => {
				acc[setting.id] = setting.enabled;
				return acc;
			},
			{} as Record<string, boolean>
		);

		savePreferencesMutation.mutate(allSettings);
	};

	if (isLoading) {
		return (
			<div className="flex flex-col justify-center items-center h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				<p className="mt-2 text-gray-600">Loading notification preferences...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-white border border-red-200 rounded-lg shadow-md p-6 max-w-3xl mx-auto">
				<h2 className="text-xl font-medium mb-2 text-red-600">Error Loading Preferences</h2>
				<p className="text-gray-500 mb-4">
					Failed to load your notification preferences. Please try again.
				</p>
				<button
					onClick={() => queryClient.invalidateQueries({ queryKey: ['notificationSettings', currentUser?.uid] })}
					className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
				>
					Retry
				</button>
			</div>
		);
	}

	return (
		<div className="bg-white border border-[#FFD9C3] rounded-lg shadow-md p-6 max-w-3xl mx-auto">
			<h2 className="text-xl font-medium mb-1">Notifications Settings</h2>
			<p className="text-gray-500 mb-2">
				Control which alerts you receive via email and in your dashboard
			</p>
			
			<hr className="my-4" />
			
			{/* Email Notifications Section */}
			<h2 className="text-lg font-medium">Email Notifications</h2>
			<p className="text-gray-500 mb-6">Manage emails from Social Shake</p>
			<div className="space-y-6">
				{localEmailSettings.map((setting) => (
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
								onChange={() => toggleEmailSetting(setting.id)}
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

			{/* Dashboard Settings Section */}
			<hr className="my-4" />
			<h2 className="text-lg font-medium">Dashboard Alerts</h2>
			<p className="text-gray-500 mb-6">
				Notifications displayed in your dashboard
			</p>
			<div className="space-y-6">
				{localDashboardSettings.map((dashboardSetting) => (
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
								onChange={() => toggleDashboardSetting(dashboardSetting.id)}
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

			{/* Save Button */}
			<div className="mt-8 flex justify-end">
				<button
					onClick={savePreferences}
					disabled={savePreferencesMutation.isPending}
					className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-6 rounded-lg transition-colors"
				>
					{savePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
				</button>
			</div>

			{/* Success/Error Messages */}
			{savePreferencesMutation.isSuccess && (
				<div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
					Preferences saved successfully!
				</div>
			)}
			
			{savePreferencesMutation.isError && (
				<div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
					Failed to save preferences. Please try again.
				</div>
			)}
		</div>
	);
}
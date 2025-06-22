import { useState } from "react";
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

const defaultSettings: NotificationSetting[] = [
	{
		id: "creator_applications",
		title: "New creator applications",
		description: "Receive emails when creators apply to your projects",
		enabled: true,
	},
	{
		id: "submission_approvals",
		title: "Project Submission approval requests",
		description: "Get notified when submissions needs your approval",
		enabled: true,
	},
	{
		id: "payment_receipts",
		title: "Payment receipts",
		description: "Receive email confirmations for all payments",
		enabled: true,
	},
	{
		id: "milestone_updates",
		title: "Creator milestone updates",
		description: "Get notified about project progress and milestones",
		enabled: true,
	},
	{
		id: "deadline_reminders",
		title: "Contest deadline reminders",
		description: "Receive reminders about upcoming project deadlines",
		enabled: false,
	},
];

export default function NotificationPreferences() {
	const { currentUser } = useAuth();
	const queryClient = useQueryClient();
	const [localSettings, setLocalSettings] = useState<NotificationSetting[]>(defaultSettings);

	// Fetch notification settings
	const {
		data: settings,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["notificationSettings", currentUser?.uid],
		queryFn: async () => {
			if (!currentUser) throw new Error("No user authenticated");

			const userDocRef = doc(db, "users", currentUser.uid);
			const userDoc = await getDoc(userDocRef);

			if (userDoc.exists() && userDoc.data().notificationSettings) {
				const userSettings = userDoc.data().notificationSettings;

				// Merge default settings with user's saved preferences
				return defaultSettings.map((setting) => ({
					...setting,
					enabled:
						userSettings[setting.id] !== undefined
							? userSettings[setting.id]
							: setting.enabled,
				}));
			}

			return defaultSettings;
		},
		enabled: !!currentUser,
	});

	// Save notification settings mutation
	const saveSettingsMutation = useMutation({
		mutationFn: async (newSettings: NotificationSetting[]) => {
			if (!currentUser) throw new Error("No user authenticated");

			const userDocRef = doc(db, "users", currentUser.uid);

			// Convert settings array to object for storage
			const settingsObj = newSettings.reduce(
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

			return newSettings;
		},
		onSuccess: (updatedSettings) => {
			// Update the query cache with the new settings
			queryClient.setQueryData(
				["notificationSettings", currentUser?.uid],
				updatedSettings
			);
		},
		onError: (error) => {
			console.error("Error saving notification preferences:", error);
			// Reset local state to server state on error
			if (settings) {
				setLocalSettings(settings);
			}
		},
	});

	// Initialize local state when query data loads
	useState(() => {
		if (settings) {
			setLocalSettings(settings);
		}
	});

	const toggleSetting = (id: string) => {
		setLocalSettings((prev) =>
			prev.map((setting) =>
				setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
			)
		);
	};

	const savePreferences = () => {
		saveSettingsMutation.mutate(localSettings);
	};

	// Use settings from query or local state as fallback
	const currentSettings = settings || localSettings;

	if (isLoading) {
		return (
			<div className="flex flex-col justify-center items-center">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				Loading notification preferences...
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-3xl mx-auto">
				<p className="text-red-600">
					Error loading notification preferences. Please try again.
				</p>
			</div>
		);
	}

	return (
		<div className="bg-white border border-[#FFD9C3] rounded-lg shadow-md p-6 max-w-3xl mx-auto">
			<h2 className="text-xl font-medium mb-1">Notifications & Alerts</h2>
			<p className="text-gray-500 mb-2">
				Manage your notification preferences.
			</p>
			<hr className="my-4" />
			<div className="space-y-6">
				{currentSettings.map((setting) => (
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

			<div className="mt-8 flex justify-end">
				<button
					onClick={savePreferences}
					disabled={saveSettingsMutation.isPending}
					className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2 px-6 rounded-lg transition-colors"
				>
					{saveSettingsMutation.isPending ? "Saving..." : "Save Preferences"}
				</button>
			</div>

			{saveSettingsMutation.isError && (
				<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
					<p className="text-red-600 text-sm">
						Failed to save preferences. Please try again.
					</p>
				</div>
			)}

			{saveSettingsMutation.isSuccess && (
				<div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
					<p className="text-green-600 text-sm">
						Preferences saved successfully!
					</p>
				</div>
			)}
		</div>
	);
}
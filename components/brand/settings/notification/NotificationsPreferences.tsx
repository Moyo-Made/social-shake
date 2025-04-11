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
	const { user } = useAuth();
	const [settings, setSettings] = useState<NotificationSetting[]>([
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
	]);
	const [isSaving, setIsSaving] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	// Fetch current notification settings
	useEffect(() => {
		async function fetchSettings() {
			if (!user) return;

			try {
				const userDocRef = doc(db, "users", user.uid);
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
				}
				setIsLoading(false);
			} catch (error) {
				console.error("Error fetching notification settings:", error);
				setIsLoading(false);
			}
		}

		fetchSettings();
	}, [user]);

	const toggleSetting = (id: string) => {
		setSettings((prev) =>
			prev.map((setting) =>
				setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
			)
		);
	};

	const savePreferences = async () => {
		if (!user) return;

		setIsSaving(true);

		try {
			const userDocRef = doc(db, "users", user.uid);

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
			<div className="flex flex-col justify-center items-center">
				<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
				Loading notification preferences...
			</div>
		);
	}

	return (
		<div className="bg-white border border-[#FFD9C3] rounded-lg shadow-md p-6  max-w-3xl mx-auto">
			<h2 className="text-2xl font-medium mb-1">Notifications & Alerts</h2>
			<p className="text-gray-500 mb-2">
				Manage your notification preferences.
			</p>
			<div className="w-full border border-[#6670854D] mb-6" />
			<div className="space-y-6">
				{settings.map((setting) => (
					<div key={setting.id} className="flex items-center justify-between">
						<div>
							<h3 className="font-medium text-lg">{setting.title}</h3>
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
								className={`w-14 h-7 rounded-full transition-colors duration-200 ease-in-out
                ${setting.enabled ? "bg-orange-500" : "bg-gray-200"}
                after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all
                peer-checked:after:translate-x-7`}
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

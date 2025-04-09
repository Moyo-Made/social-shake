import { useState, FormEvent, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
	getAuth,
	EmailAuthProvider,
	reauthenticateWithCredential,
	updatePassword,
} from "firebase/auth";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";

interface SecuritySettingsProps {
	userEmail: string;
}

export default function SecurityPrivacySettings({
	userEmail,
}: SecuritySettingsProps) {
	// Form states
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [twoFactorMethod, setTwoFactorMethod] = useState("email");
	const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [passwordErrors, setPasswordErrors] = useState({
		current: "",
		new: "",
		confirm: "",
	});

	const { toast } = useToast();

	// Password validation
	const validatePassword = () => {
		let isValid = true;
		const errors = {
			current: "",
			new: "",
			confirm: "",
		};

		if (!currentPassword) {
			errors.current = "Current password is required";
			isValid = false;
		}

		if (!newPassword) {
			errors.new = "New password is required";
			isValid = false;
		} else if (newPassword.length < 8) {
			errors.new = "Password must be at least 8 characters";
			isValid = false;
		}

		if (newPassword !== confirmPassword) {
			errors.confirm = "Passwords do not match";
			isValid = false;
		}

		setPasswordErrors(errors);
		return isValid;
	};

	// In your password change function
	const handlePasswordChange = async (e: FormEvent) => {
		e.preventDefault();

		if (!validatePassword()) {
			return;
		}

		setIsSubmittingPassword(true);

		try {
			const auth = getAuth();
			const user = auth.currentUser;

			if (!user || user.email !== userEmail) {
				throw new Error("You must be logged in to change your password");
			}

			// Re-authenticate user with current password
			const credential = EmailAuthProvider.credential(
				userEmail,
				currentPassword
			);
			await reauthenticateWithCredential(user, credential);

			// Update password
			await updatePassword(user, newPassword);

			toast({
				title: "Password Updated",
				description: "Your password has been successfully changed.",
				variant: "default",
			});

			// Reset form fields
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			setPasswordErrors({
				current: "",
				new: "",
				confirm: "",
			});
		} catch (error) {
			console.error("Error:", error);

			// Handle specific Firebase Auth errors
			if ((error as { code?: string }).code === "auth/wrong-password") {
				setPasswordErrors({
					...passwordErrors,
					current: "Current password is incorrect",
				});
			}

			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to update password",
				variant: "destructive",
			});
		} finally {
			setIsSubmittingPassword(false);
		}
	};

	// Handle 2FA setting change
	const handleTwoFactorUpdate = async () => {
		setIsSubmitting(true);

		try {
			const response = await fetch("/api/user/two-factor", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: userEmail,
					twoFactorMethod: twoFactorMethod === "none" ? null : twoFactorMethod,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to update two-factor settings");
			}

			toast({
				title: "Two-Factor Authentication Updated",
				description:
					twoFactorMethod === "none"
						? "Two-factor authentication has been disabled."
						: `Two-factor authentication method set to ${twoFactorMethod}.`,
				variant: "default",
			});
		} catch (error) {
			toast({
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to update two-factor settings",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	// Load user's current 2FA setting
	useEffect(() => {
		const fetchUserSettings = async () => {
			if (!userEmail) return;

			try {
				const response = await fetch(`/api/user/settings?email=${userEmail}`);
				const data = await response.json();

				if (response.ok && data.twoFactorMethod) {
					setTwoFactorMethod(data.twoFactorMethod);
				} else {
					setTwoFactorMethod("none");
				}
			} catch (error) {
				console.error("Failed to fetch user settings:", error);
			}
		};

		fetchUserSettings();
	}, [userEmail]);

	return (
		<div className="bg-white border border-[#FFD9C3] rounded-lg p-6 space-y-8">
			<div>
				<h1 className="text-2xl font-bold mb-3">Security & Privacy</h1>
				<div className="w-full border border-[#6670854D] mb-4" />
			</div>

			{/* Password Change Section */}
			<div className="space-y-4">
				<div>
					<h2 className="text-xl font-bold">Change Password</h2>
					<p className="text-gray-500">
						Update your password to maintain account security
					</p>
				</div>

				<form onSubmit={handlePasswordChange} className="space-y-4">
					<div>
						<Label htmlFor="currentPassword" className="block mb-2">
							Current Password
						</Label>
						<Input
							id="currentPassword"
							type="password"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							className="w-full p-2 border rounded-md"
						/>
						{passwordErrors.current && (
							<p className="text-red-500 text-sm mt-1">
								{passwordErrors.current}
							</p>
						)}
					</div>

					<div>
						<Label htmlFor="newPassword" className="block mb-2">
							New Password
						</Label>
						<Input
							id="newPassword"
							type="password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							className="w-full p-2 border rounded-md"
						/>
						<p className="text-gray-500 text-sm mt-1">
							Must be at least 8 characters.
						</p>
						{passwordErrors.new && (
							<p className="text-red-500 text-sm">{passwordErrors.new}</p>
						)}
					</div>

					<div>
						<Label htmlFor="confirmPassword" className="block mb-2">
							Confirm New Password
						</Label>
						<Input
							id="confirmPassword"
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="w-full p-2 border rounded-md"
						/>
						<p className="text-gray-500 text-sm mt-1">
							Must be at least 8 characters.
						</p>
						{passwordErrors.confirm && (
							<p className="text-red-500 text-sm">{passwordErrors.confirm}</p>
						)}
					</div>

					<Button
						type="submit"
						className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition"
						disabled={isSubmittingPassword}
					>
						{isSubmittingPassword ? "Saving..." : "Save Password"}
					</Button>
				</form>
			</div>

			{/* Two-Factor Authentication Section */}
			<div className="space-y-4">
				<div>
					<h2 className="text-xl font-bold">Two-Factor Authentication (2FA)</h2>
					<p className="text-gray-500">
						Add an extra layer of security to your account
					</p>
				</div>

				<div className="space-y-2">
					{/* No 2FA */}
					<div
						className="flex items-center space-x-2"
						onClick={() => setTwoFactorMethod("none")}
					>
						<div className="relative flex items-center justify-center">
							<input
								id="2fa-none"
								type="radio"
								name="2fa"
								value="none"
								checked={twoFactorMethod === "none"}
								onChange={() => setTwoFactorMethod("none")}
								className="sr-only" // Hide the actual input
							/>
							<div
								className={`h-4 w-4 rounded-full border ${
									twoFactorMethod === "none"
										? "border-[#FD5C02] bg-white"
										: "border-gray-300 bg-white"
								}`}
							>
								{twoFactorMethod === "none" && (
									<div className="h-2 w-2 rounded-full bg-[#FD5C02] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
								)}
							</div>
						</div>
						<div>
							<Label htmlFor="2fa-none" className="font-medium cursor-pointer">
								Don&apos;t use 2FA
							</Label>
							<p className="text-gray-500 text-sm">
								Not recommended. Your account will be protected by password
								only.
							</p>
						</div>
					</div>

					{/* Email Authentication */}
					<div
						className="flex items-center space-x-2"
						onClick={() => setTwoFactorMethod("email")}
					>
						<div className="relative flex items-center justify-center">
							<input
								id="2fa-email"
								type="radio"
								name="2fa"
								value="email"
								checked={twoFactorMethod === "email"}
								onChange={() => setTwoFactorMethod("email")}
								className="sr-only" // Hide the actual input
							/>
							<div
								className={`h-4 w-4 rounded-full border ${
									twoFactorMethod === "email"
										? "border-[#FD5C02] bg-white"
										: "border-gray-300 bg-white"
								}`}
							>
								{twoFactorMethod === "email" && (
									<div className="h-2 w-2 rounded-full bg-[#FD5C02] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
								)}
							</div>
						</div>
						<div>
							<Label htmlFor="2fa-email" className="font-medium cursor-pointer">
								Email Authentication
							</Label>
							<p className="text-gray-500 text-sm">
								Receive a verification code via Email when logging in.
							</p>
						</div>
					</div>

					{/* Authenticator App */}
					<div
						className="flex items-center space-x-2"
						onClick={() => setTwoFactorMethod("app")}
					>
						<div className="relative flex items-center justify-center">
							<input
								id="2fa-app"
								type="radio"
								name="2fa"
								value="app"
								checked={twoFactorMethod === "app"}
								onChange={() => setTwoFactorMethod("app")}
								className="sr-only" // Hide the actual input
							/>
							<div
								className={`h-4 w-4 rounded-full border ${
									twoFactorMethod === "app"
										? "border-[#FD5C02] bg-white"
										: "border-gray-300 bg-white"
								}`}
							>
								{twoFactorMethod === "app" && (
									<div className="h-2 w-2 rounded-full bg-[#FD5C02] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
								)}
							</div>
						</div>
						<div>
							<Label htmlFor="2fa-app" className="font-medium cursor-pointer">
								Authenticator App
							</Label>
							<p className="text-gray-500 text-sm">
								Use an authenticator app like Google Authenticator or Authy
							</p>
						</div>
					</div>
				</div>

				<Button
					onClick={handleTwoFactorUpdate}
					className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition"
					disabled={isSubmitting}
				>
					{isSubmitting ? "Saving..." : "Save Changes"}
				</Button>
			</div>
		</div>
	);
}

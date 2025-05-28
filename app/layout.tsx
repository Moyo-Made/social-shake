import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import localFont from "next/font/local";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { SocketProvider } from "@/context/SocketContext";
import { NotificationsProvider } from "@/context/NotificationContext";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
});

const satoshi = localFont({
	src: [
		{
			path: "../public/fonts/Satoshi-Regular.otf",
			weight: "400",
			style: "normal",
		},
		{
			path: "../public/fonts/Satoshi-Medium.otf",
			weight: "500",
			style: "normal",
		},
		{
			path: "../public/fonts/Satoshi-Bold.otf",
			weight: "700",
			style: "normal",
		},
	],
	variable: "--font-satoshi",
});

export const metadata: Metadata = {
	title: "Social Shake",
	description: "",
	icons: {
		icon: [{ url: "/images/logo.svg", type: "image/svg+xml" }],
		apple: { url: "/images/logo.svg", sizes: "180x180" },
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${inter.variable} ${satoshi.variable}`}>
				<AuthProvider>
					
					<SocketProvider>
						<NotificationsProvider>{children}</NotificationsProvider>
						<Toaster />
					</SocketProvider>
				</AuthProvider>
			</body>
		</html>
	);
}

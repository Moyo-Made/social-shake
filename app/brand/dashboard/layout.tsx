import { MessagingProvider } from "@/context/MessagingContext";

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="">
			<MessagingProvider>{children}</MessagingProvider>
		</div>
	);
}

import SideNavLayout from "@/components/Creators/dashboard/CreatorSideNavbar";
import { MessagingProvider } from "@/context/MessagingContext";


export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="">
				<MessagingProvider>
					<SideNavLayout>{children}</SideNavLayout>
				</MessagingProvider>
		</div>
	);
}

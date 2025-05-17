import SideNavLayout from "@/components/Creators/dashboard/CreatorSideNavbar";

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="">
			<SideNavLayout>{children}</SideNavLayout>
		</div>
	);
}

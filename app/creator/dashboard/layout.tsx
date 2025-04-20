import SideNavLayout from "@/components/Creators/dashboard/CreatorSideNavbar";

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className="">
				<SideNavLayout>{children}</SideNavLayout>
			</body>
		</html>
	);
}

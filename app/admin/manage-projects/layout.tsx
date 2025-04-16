import SideNavLayout from "@/components/admin/AdminSideNav";

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

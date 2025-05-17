import SideNavLayout from "@/components/admin/AdminSideNav";

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

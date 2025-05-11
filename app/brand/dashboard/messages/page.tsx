import ChatPage from "@/components/brand/brandProfile/dashboard/messages/ChatPage";
import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";
import React, { Suspense } from "react";

const page = () => {
	return (
		<Suspense>

		<SideNavLayout>
			<ChatPage />
		</SideNavLayout>
		</Suspense>
	);
};

export default page;

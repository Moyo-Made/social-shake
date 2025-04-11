import ChatPage from "@/components/brand/brandProfile/dashboard/messages/ChatPage";
import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";
import React from "react";

const page = () => {
	return (
		<SideNavLayout>
			<ChatPage />
		</SideNavLayout>
	);
};

export default page;

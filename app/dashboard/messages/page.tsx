import ChatPage from "@/components/brandProfile/dashboard/messages/ChatPage";
import SideNavLayout from "@/components/brandProfile/dashboard/SideNav";
import React from "react";

const page = () => {
	return (
		<SideNavLayout>
			<ChatPage />
		</SideNavLayout>
	);
};

export default page;

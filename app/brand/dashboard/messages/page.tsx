import ChatPage from "@/components/brand/brandProfile/dashboard/messages/ChatPage";
import React, { Suspense } from "react";

const page = () => {
	return (
		<Suspense>
			<ChatPage />
		</Suspense>
	);
};

export default page;

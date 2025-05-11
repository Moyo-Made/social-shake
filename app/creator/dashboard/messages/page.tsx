import CreatorChatPage from "@/components/Creators/dashboard/messages/CreatorChatPage";
import React, { Suspense } from "react";

const page = () => {
	return (
		<Suspense>
			<CreatorChatPage />
		</Suspense>
	);
};

export default page;

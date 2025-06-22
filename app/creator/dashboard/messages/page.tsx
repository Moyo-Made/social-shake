// In your chat page
import CreatorChatPage from "@/components/Creators/dashboard/order/messages/CreatorChatPage";
import { MessagingProvider } from "@/context/MessagingContext";
import React, { Suspense } from "react";

const page = () => {
  return (
    <MessagingProvider>
      <Suspense>
        <CreatorChatPage />
      </Suspense>
    </MessagingProvider>
  );
};

export default page;
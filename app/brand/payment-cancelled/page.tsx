import PaymentCancelHandler from "@/components/brand/brandProfile/dashboard/PaymentCancelHandler";
import React, { Suspense } from "react";

const page = () => {
	return (
		<Suspense>
			<PaymentCancelHandler />
		</Suspense>
	);
};

export default page;

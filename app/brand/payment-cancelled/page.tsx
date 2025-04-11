import PaymentCancelled from "@/components/brand/brandProjects/PaymentCancelled";
import React, { Suspense } from "react";

const page = () => {
	return (
		<Suspense>
			<PaymentCancelled />
		</Suspense>
	);
};

export default page;

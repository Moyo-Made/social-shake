import PaymentSuccessful from "@/components/brand/brandProfile/dashboard/PaymentSuccessful";
import React, { Suspense } from "react";

const page = () => {
	return (
		<Suspense>
			<PaymentSuccessful />
		</Suspense>
	);
};

export default page;

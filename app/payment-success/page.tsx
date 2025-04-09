import PaymentSuccessful from "@/components/brandProfile/dashboard/PaymentSuccessful";
import React, { Suspense } from "react";

const page = () => {
	return (
		<Suspense>
			<PaymentSuccessful />
		</Suspense>
	);
};

export default page;

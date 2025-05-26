import VideoPaymentSuccessHandler from "@/components/brand/VideoPaymentSuccessHandler";
import { Suspense } from "react";

export default function PaymentSuccessPage() {
	return (
		<Suspense>
			<VideoPaymentSuccessHandler />
		</Suspense>
	);
}

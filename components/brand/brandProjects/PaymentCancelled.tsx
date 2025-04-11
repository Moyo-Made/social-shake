"use client";

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";

export default function PaymentCancelled() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams.get('payment_id');

  useEffect(() => {
    // Keep the form data in storage so user can try again
    console.log('Payment was cancelled', paymentId);
  }, [paymentId]);

  const handleTryAgain = () => {
    // Navigate back to the form's last step
    sessionStorage.setItem('contestFormStep', '4'); // Set to review step
    router.push('/contests/new');
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Cancelled</h1>
        <p className="text-gray-600 mb-6">
          Your contest hasn&apos;t been created yet. You can try again or return to your dashboard.
        </p>
        <div className="space-y-4">
          <Button 
            onClick={handleTryAgain} 
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            Try Again
          </Button>
          <Button 
            onClick={() => router.push('/brand/dashboard')} 
            variant="outline"
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
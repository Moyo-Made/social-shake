"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

export default function PaymentSuccessHandler() {
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const processPayment = async () => {
      try {
        const paymentId = searchParams.get('payment_id');
        const sessionId = searchParams.get('session_id');
        
        if (!paymentId || !sessionId) {
          setError('Missing payment information');
          setStatus('error');
          return;
        }
        
        // First verify the payment was successful
        const verifyResponse = await axios.get(`/api/payment-success?payment_id=${paymentId}&session_id=${sessionId}`);
        
        if (!verifyResponse.data.success) {
          throw new Error(verifyResponse.data.error || 'Payment verification failed');
        }
        
        // Get stored form data from sessionStorage
        const storedFormData = sessionStorage.getItem('contestFormData');
        if (!storedFormData) {
          throw new Error('Contest form data not found');
        }
        
        const formData = JSON.parse(storedFormData);
        
        // Create the contest using your existing API
        const contestData = {
          ...formData,
          isDraft: false,
          paymentId,
          stripeSessionId: sessionId
        };
        
        // Call the contests API to create the contest
        const contestResponse = await axios.post('/api/contests', contestData);
        
        if (!contestResponse.data.success) {
          throw new Error(contestResponse.data.error || 'Failed to create contest');
        }
        
        // Clear form data from sessionStorage
        sessionStorage.removeItem('contestFormData');
        sessionStorage.removeItem('contestFormStep');
        
        // Update payment record to mark as completed
        await axios.post('/api/update-payment', {
          paymentId,
          status: 'completed',
          contestId: contestResponse.data.data.contestId
        });
        
        setStatus('success');
        
        // Redirect to contest details or dashboard
        setTimeout(() => {
          router.push(`/brand/dashboard?contest=${contestResponse.data.data.contestId}`);
        }, 2000);
        
      } catch (error) {
        console.error('Error processing payment:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
        setStatus('error');
      }
    };
    
    processPayment();
  }, [searchParams, router]);
  
  if (status === 'verifying') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
        <h1 className="text-2xl font-bold mb-2">Processing your payment...</h1>
        <p className="text-gray-600">Please wait while we verify your payment and create your contest.</p>
      </div>
    );
  }
  
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md mx-auto mb-4">
          <h1 className="text-xl font-bold mb-2">Payment Processing Error</h1>
          <p>{error}</p>
        </div>
        <button 
          onClick={() => router.push('/brand/create-contest')}
          className="bg-black hover:bg-gray-800 text-white py-2 px-4 rounded"
        >
          Return to Contest Creation
        </button>
      </div>
    );
  }
  
  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded max-w-md mx-auto mb-4">
          <h1 className="text-xl font-bold mb-2">Payment Successful!</h1>
          <p>Your contest has been created successfully.</p>
        </div>
        <p className="text-gray-600 mb-4">Redirecting you to your dashboard...</p>
      </div>
    );
  }
  
  return null;
}
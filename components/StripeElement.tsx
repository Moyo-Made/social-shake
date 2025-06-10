/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
	Elements,
	CardElement,
	useStripe,
	useElements
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '');

interface PaymentFormProps {
	clientSecret: string;
	paymentType: string;
	productName: string;
	amount: number;
	onSuccess: (paymentIntentId: string) => void;
	onError: (error: string) => void;
	userEmail: string;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
	clientSecret,
	paymentType,
	productName,
	amount,
	onSuccess,
	onError,
	userEmail
}) => {
	const stripe = useStripe();
	const elements = useElements();
	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		if (!stripe || !elements) {
			setError('Stripe has not loaded yet. Please try again.');
			return;
		}

		const cardElement = elements.getElement(CardElement);
		if (!cardElement) {
			setError('Card element not found. Please refresh the page.');
			return;
		}

		setProcessing(true);
		setError(null);

		try {
			const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
				clientSecret,
				{
					payment_method: {
						card: cardElement,
						billing_details: {
							email: userEmail,
						},
					},
				}
			);

			if (confirmError) {
				console.error('Payment confirmation error:', confirmError);
				setError(confirmError.message || 'Payment failed. Please try again.');
				onError(confirmError.message || 'Payment failed');
			} else if (paymentIntent && paymentIntent.status === 'succeeded') {
				console.log('Payment succeeded:', paymentIntent.id);
				onSuccess(paymentIntent.id);
			} else if (paymentIntent && paymentIntent.status === 'requires_capture') {
				// For escrow payments that require manual capture
				console.log('Payment authorized (escrow):', paymentIntent.id);
				onSuccess(paymentIntent.id);
			} else {
				setError('Payment was not completed. Please try again.');
				onError('Payment was not completed');
			}
		} catch (err) {
			console.error('Payment error:', err);
			const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
			setError(errorMessage);
			onError(errorMessage);
		} finally {
			setProcessing(false);
		}
	};

	const cardElementOptions = {
		style: {
			base: {
				fontSize: '16px',
				color: '#424770',
				'::placeholder': {
					color: '#aab7c4',
				},
				fontFamily: 'system-ui, -apple-system, sans-serif',
			},
			invalid: {
				color: '#9e2146',
			},
		},
		hidePostalCode: false,
	};

	return (
		<div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
			<div className="mb-6">
				<h3 className="text-lg font-semibold text-gray-900 mb-2">
					Complete Payment
				</h3>
				<div className="text-sm text-gray-600">
					<p><strong>Item:</strong> {productName}</p>
					<p><strong>Amount:</strong> ${amount.toFixed(2)}</p>
					<p><strong>Type:</strong> {paymentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Card Information
					</label>
					<div className="border border-gray-300 rounded-md p-3 bg-white">
						<CardElement options={cardElementOptions} />
					</div>
				</div>

				{error && (
					<div className="bg-red-50 border border-red-200 rounded-md p-3">
						<p className="text-sm text-red-600">{error}</p>
					</div>
				)}

				<button
					type="submit"
					disabled={!stripe || processing}
					className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
						processing
							? 'bg-gray-400 cursor-not-allowed'
							: 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
					} text-white`}
				>
					{processing ? (
						<div className="flex items-center justify-center">
							<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
							Processing...
						</div>
					) : (
						`Pay $${amount.toFixed(2)}`
					)}
				</button>
			</form>

			{paymentType.includes('escrow') && (
				<div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
					<p className="text-xs text-blue-600">
						<strong>Escrow Payment:</strong> Your funds will be held securely until the work is completed and approved.
					</p>
				</div>
			)}
		</div>
	);
};

interface StripeElementsPaymentProps {
	checkoutData: {
		amount: number;
		paymentId: string;
		projectTitle: string;
		userEmail: string;
		userId: string;
		paymentType: string;
		orderId?: string;
		creatorId?: string;
		[key: string]: any;
	};
	onSuccess: (paymentIntentId: string) => void;
	onError: (error: string) => void;
}

const StripeElementsPayment: React.FC<StripeElementsPaymentProps> = ({
	checkoutData,
	onSuccess,
	onError
}) => {
	const [clientSecret, setClientSecret] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [paymentDetails, setPaymentDetails] = useState<any>(null);

	useEffect(() => {
		const initializePayment = async () => {
			try {
				setLoading(true);
				
				// Call API with useElementsFlow flag
				const response = await fetch('/api/create-checkout-session', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						...checkoutData,
						useElementsFlow: true, // This tells the API to return client secret instead of creating checkout session
					}),
				});

				const result = await response.json();

				if (!result.success) {
					throw new Error(result.error || 'Failed to initialize payment');
				}

				if (result.useElementsFlow && result.clientSecret) {
					// Use Elements flow
					setClientSecret(result.clientSecret);
					setPaymentDetails(result);
				} else {
					// Fall back to checkout session redirect
					const stripe = await stripePromise;
					if (!stripe) {
						throw new Error('Stripe is not initialized');
					}

					const { error } = await stripe.redirectToCheckout({
						sessionId: result.sessionId
					});

					if (error) {
						throw new Error(error.message || 'Checkout redirect failed');
					}
				}
			} catch (error) {
				console.error('Payment initialization error:', error);
				const errorMessage = error instanceof Error ? error.message : 'Payment initialization failed';
				onError(errorMessage);
			} finally {
				setLoading(false);
			}
		};

		initializePayment();
	}, [checkoutData, onError]);

	const handlePaymentSuccess = (paymentIntentId: string) => {
		console.log('Payment completed successfully:', paymentIntentId);
		onSuccess(paymentIntentId);
	};

	const handlePaymentError = (error: string) => {
		console.error('Payment error:', error);
		onError(error);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				<span className="ml-3 text-gray-600">Initializing payment...</span>
			</div>
		);
	}

	if (!clientSecret || !paymentDetails) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-md">
				<p className="text-red-600">Payment initialization failed. Please try again.</p>
			</div>
		);
	}

	return (
		<Elements stripe={stripePromise}>
			<PaymentForm
				clientSecret={clientSecret}
				paymentType={paymentDetails.paymentType}
				productName={paymentDetails.productName}
				amount={paymentDetails.calculatedAmount}
				userEmail={checkoutData.userEmail}
				onSuccess={handlePaymentSuccess}
				onError={handlePaymentError}
			/>
		</Elements>
	);
};

export default StripeElementsPayment;
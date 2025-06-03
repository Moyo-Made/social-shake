import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-03-31.basil',
});

export async function GET(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: any
) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const transactionId = params.id;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Fetch balance transaction details from Stripe
    const balanceTransaction = await stripe.balanceTransactions.retrieve(
      transactionId,
      {
        expand: ['source'],
      },
      {
        stripeAccount: accountId,
      }
    );

    // Get additional details based on transaction type
    let additionalDetails = {};

    if (balanceTransaction.type === 'charge' && balanceTransaction.source) {
      // Get charge details
      try {
        const charge = await stripe.charges.retrieve(
          balanceTransaction.source as string,
          {
            expand: ['customer', 'payment_method'],
          },
          {
            stripeAccount: accountId,
          }
        );

        additionalDetails = {
          customerEmail: charge.billing_details?.email,
          paymentMethod: charge.payment_method_details?.type,
          receiptUrl: charge.receipt_url,
          chargeId: charge.id,
        };
      } catch (error) {
        console.log('Could not fetch charge details:', error);
      }
    } else if (balanceTransaction.type === 'payout' && balanceTransaction.source) {
      // Get payout details
      try {
        const payout = await stripe.payouts.retrieve(
          balanceTransaction.source as string,
          {},
          {
            stripeAccount: accountId,
          }
        );

        additionalDetails = {
          payoutMethod: payout.method,
          arrivalDate: payout.arrival_date,
          automatic: payout.automatic,
          failureCode: payout.failure_code,
          failureMessage: payout.failure_message,
          payoutId: payout.id,
        };
      } catch (error) {
        console.log('Could not fetch payout details:', error);
      }
    }

    // Format the transaction details
    const transactionDetails = {
      id: balanceTransaction.id,
      amount: balanceTransaction.amount / 100,
      net: balanceTransaction.net / 100,
      fee: balanceTransaction.fee / 100,
      currency: balanceTransaction.currency,
      type: balanceTransaction.type,
      status: balanceTransaction.status,
      created: balanceTransaction.created,
      description: balanceTransaction.description,
      source: balanceTransaction.source,
      feeDetails: balanceTransaction.fee_details?.map(fee => ({
        amount: fee.amount / 100,
        currency: fee.currency,
        description: fee.description,
        type: fee.type,
      })),
      ...additionalDetails,
    };

    return NextResponse.json({
      transaction: transactionDetails,
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error fetching transaction details:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch transaction details' },
      { status: 500 }
    );
  }
}
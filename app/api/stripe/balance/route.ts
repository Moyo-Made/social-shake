import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Fetch balance from Stripe Connect account
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    });

    // Calculate total available (including instant available)
    const availableBalance = balance.available.reduce((sum, item) => sum + item.amount, 0);
    const pendingBalance = balance.pending.reduce((sum, item) => sum + item.amount, 0);
    const instantAvailable = balance.instant_available?.reduce((sum, item) => sum + item.amount, 0) || 0;

    // Fetch balance transactions to calculate total earnings
    const balanceTransactions = await stripe.balanceTransactions.list({
      limit: 100,
      type: 'charge',
    }, {
      stripeAccount: accountId,
    });

    // Calculate total earnings from successful charges
    const totalEarnings = balanceTransactions.data
      .filter(txn => txn.status === 'available')
      .reduce((sum, txn) => sum + txn.net, 0);

    return NextResponse.json({
      availableBalance: (availableBalance / 100).toFixed(2),
      processingPayments: (pendingBalance / 100).toFixed(2),
      totalEarnings: (totalEarnings / 100).toFixed(2),
      instantAvailable: (instantAvailable / 100).toFixed(2),
      currency: balance.available[0]?.currency || 'usd',
    });

  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance data' },
      { status: 500 }
    );
  }
}
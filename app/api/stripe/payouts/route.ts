import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-03-31.basil',
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '25');
    const startingAfter = searchParams.get('startingAfter');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Build query parameters
    const queryParams: Stripe.PayoutListParams = {
      limit,
    };

    if (startingAfter) {
      queryParams.starting_after = startingAfter;
    }

    // Fetch payouts from Stripe
    const payouts = await stripe.payouts.list(queryParams, {
      stripeAccount: accountId,
    });

    // Transform Stripe payout data
    const payoutData = payouts.data.map((payout) => ({
      id: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency,
      status: payout.status,
      arrivalDate: payout.arrival_date,
      created: payout.created,
      description: payout.description || 'Bank transfer',
      method: payout.method,
      type: payout.type,
      automatic: payout.automatic,
      failureCode: payout.failure_code,
      failureMessage: payout.failure_message,
    }));

    return NextResponse.json({
      payouts: payoutData,
      hasMore: payouts.has_more,
      lastId: payouts.data[payouts.data.length - 1]?.id,
    });

  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}

// POST endpoint for creating manual payouts
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    
    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { amount, currency = 'usd', method = 'standard' } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // Create manual payout
    const payout = await stripe.payouts.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      method,
    }, {
      stripeAccount: accountId,
    });

    return NextResponse.json({
      payout: {
        id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        status: payout.status,
        arrivalDate: payout.arrival_date,
        created: payout.created,
        method: payout.method,
        automatic: payout.automatic,
      },
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error creating payout:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payout' },
      { status: 500 }
    );
  }
}
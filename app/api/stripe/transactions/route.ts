import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-03-31.basil',
});

// Helper function to format transaction type
const formatTransactionType = (type: string): string => {
  switch (type) {
    case 'charge':
      return 'sale';
    case 'refund':
      return 'refund';
    case 'payout':
      return 'payout';
    case 'adjustment':
      return 'adjustment';
    case 'application_fee':
      return 'fee';
    default:
      return type;
  }
};

// Helper function to format transaction status
const formatTransactionStatus = (status: string, type: string): string => {
  if (type === 'payout') {
    switch (status) {
      case 'paid':
        return 'Withdrawn';
      case 'pending':
      case 'in_transit':
        return 'Processing';
      case 'failed':
      case 'canceled':
        return 'Failed';
      default:
        return 'Processing';
    }
  }
  
  switch (status) {
    case 'available':
      return 'Processed';
    case 'pending':
      return 'Processing';
    default:
      return 'Processed';
  }
};

// Helper function to get transaction description
const getTransactionDescription = (txn: Stripe.BalanceTransaction): string => {
  if (txn.type === 'charge') {
    return txn.description || 'Payment received';
  } else if (txn.type === 'refund') {
    return 'Refund processed';
  } else if (txn.type === 'payout') {
    return 'Payout to bank account';
  } else if (txn.type === 'adjustment') {
    return 'Balance adjustment';
  } else if (txn.type === 'application_fee') {
    return 'Platform fee';
  }
  return txn.description || 'Transaction';
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '25');
    const startingAfter = searchParams.get('startingAfter');
    const type = searchParams.get('type'); // charge, refund, payout
    const created = searchParams.get('created'); // Unix timestamp for date filtering

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Build query parameters
    const queryParams: Stripe.BalanceTransactionListParams = {
      limit,
      expand: ['data.source'],
    };

    if (startingAfter) {
      queryParams.starting_after = startingAfter;
    }

    if (type && type !== 'all-types') {
      queryParams.type = type as Stripe.BalanceTransaction.Type;
    }

    if (created) {
      queryParams.created = {
        gte: parseInt(created),
      };
    }

    // Fetch balance transactions from Stripe
    const balanceTransactions = await stripe.balanceTransactions.list(
      queryParams,
      {
        stripeAccount: accountId,
      }
    );

    // Transform Stripe data to match your component's expected format
    const transactions = balanceTransactions.data.map((txn) => ({
      id: txn.id,
      description: getTransactionDescription(txn),
      date: new Date(txn.created * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      status: formatTransactionStatus(txn.status, txn.type),
      amount: `$${Math.abs(txn.net / 100).toFixed(2)}`,
      type: formatTransactionType(txn.type),
      currency: txn.currency,
      fee: txn.fee / 100,
      gross: txn.amount / 100,
      net: txn.net / 100,
      stripeTransactionId: txn.id,
      source: txn.source,
    }));

    return NextResponse.json({
      transactions,
      hasMore: balanceTransactions.has_more,
      lastId: balanceTransactions.data[balanceTransactions.data.length - 1]?.id,
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
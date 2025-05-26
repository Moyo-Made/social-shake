import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { creatorId, amount, type, videoId, paymentId } = await request.json();

    const creatorRef = adminDb.collection('users').doc(creatorId);
    const creatorDoc = await creatorRef.get();

    if (!creatorDoc.exists) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const creatorData = creatorDoc.data();
    const currentEarnings = creatorData?.totalEarnings || 0;
    const currentSales = creatorData?.totalSales || 0;

    // Update creator earnings
    await creatorRef.update({
      totalEarnings: currentEarnings + amount,
      totalSales: currentSales + 1,
      lastSaleAt: new Date().toISOString(),
    });

    // Create earnings record
    await adminDb.collection('earnings').add({
      creatorId,
      amount,
      type,
      videoId,
      paymentId,
      createdAt: new Date().toISOString(),
      status: 'completed',
    });

    return NextResponse.json({
      success: true,
      message: 'Creator earnings updated successfully'
    });

  } catch (error) {
    console.error('Error updating creator earnings:', error);
    return NextResponse.json({ error: 'Failed to update creator earnings' }, { status: 500 });
  }
}
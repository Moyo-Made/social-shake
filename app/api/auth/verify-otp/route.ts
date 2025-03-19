import { NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();
    
    if (!email || !otp) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email and OTP are required' 
      }, { status: 400 });
    }

    // Get the stored OTP document
    const otpDoc = await adminDb.collection('otpVerifications').doc(email).get();
    
    if (!otpDoc.exists) {
      return NextResponse.json({ 
        success: false, 
        error: 'No verification code found for this email' 
      }, { status: 400 });
    }

    const otpData = otpDoc.data();
    
    // Check if OTP has expired
    const expiresAt = otpData?.expiresAt.toDate();
    if (expiresAt < new Date()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Verification code has expired' 
      }, { status: 400 });
    }

    // Check if OTP matches
    if (otpData?.otp !== otp) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid verification code' 
      }, { status: 400 });
    }

    // Mark as verified
    await adminDb.collection('otpVerifications').doc(email).update({
      verified: true,
      verifiedAt: new Date()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to verify code' 
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { sendOTPEmail } from '@/utils/email-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, message } = body;
    
    // Validate required fields
    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email and OTP are required' },
        { status: 400 }
      );
    }
    
    // Send the email
    await sendOTPEmail(email, otp, message);
    
    return NextResponse.json(
      { success: true, message: 'Verification email sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}
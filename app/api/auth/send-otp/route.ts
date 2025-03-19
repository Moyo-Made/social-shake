import { NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email, otp, message } = await request.json();
    
    if (!email || !otp) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email and OTP are required' 
      }, { status: 400 });
    }

    // Save OTP to Firestore with expiration time (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    await adminDb.collection('otpVerifications').doc(email).set({
      email,
      otp,
      expiresAt,
      createdAt: new Date(),
      verified: false
    });

    // Send email with OTP
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    await transporter.sendMail({
      from: `"Your App" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Verification Code',
      text: `Your verification code is: ${otp}. ${message}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="font-size: 32px; letter-spacing: 2px; background-color: #f5f5f5; padding: 10px; text-align: center;">${otp}</h1>
          <p>${message}</p>
          <p>If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to send verification code' 
    }, { status: 500 });
  }
}
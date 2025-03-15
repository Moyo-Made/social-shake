import { render } from '@react-email/render';
import nodemailer from 'nodemailer';
import { OTPEmail } from '@/components/emails/EmailOTP';

// Create a transporter object
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT) || 587,
  secure: process.env.EMAIL_SERVER_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function sendOTPEmail(to: string, otp: string, message?: string) {
  // Render the React email template to HTML
  const emailHtml = await render(OTPEmail({ otp, message }));
  
  // Define email options
  const mailOptions = {
    from: `"Your App" <${process.env.EMAIL_FROM}>`,
    to,
    subject: 'Your Verification Code',
    html: emailHtml,
  };
  
  try {
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send verification email');
  }
}
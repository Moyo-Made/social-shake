"use client"

import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const VerifyEmail = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { sendOTPEmail } = useAuth();
  
  const email = searchParams.get('email');
  
  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
    
    // Redirect if no email in URL params
    if (!email) {
      router.push('/signup');
    }
  }, [email, router]);

  // Handle countdown for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [countdown, resendDisabled]);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Move to next input if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Clear any previous errors when user types
    if (error) setError(null);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    
    if (/^\d+$/.test(pastedData)) {
      const newCode = [...code];
      pastedData.split('').forEach((char, index) => {
        if (index < 6) newCode[index] = char;
      });
      setCode(newCode);
      
      // Focus last filled input or first empty input
      const lastIndex = Math.min(pastedData.length - 1, 5);
      inputRefs.current[lastIndex]?.focus();
    }
  };

  const handleResendOTP = async () => {
    if (!email || resendDisabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Generate a new OTP
      const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Send the new OTP email
      const result = await sendOTPEmail(email, newOTP);
      
      if (result) {
        // Disable resend button for 60 seconds
        setResendDisabled(true);
        setCountdown(60);
        setSuccess(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError("Failed to resend verification code. Please try again.");
      }
    } catch (err) {
      setError("Failed to resend verification code. Please try again.");
      console.error("Error resending OTP:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!email) return;
    
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      setError("Please enter all 6 digits of the verification code");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Make API call to verify OTP
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp: verificationCode
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Redirect to success page
        router.push('/account-successfully-created');
      } else {
        setError(data.error || "Invalid verification code. Please try again.");
      }
    } catch (err) {
      setError("Failed to verify your code. Please try again.");
      console.error("Verification error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='relative min-h-[80vh] overflow-y-hidden'>
      <div className="w-full border-t border-[#1A1A1A]" />
      <Card className="w-full max-w-md mx-auto mt-10 lg:mt-16 font-satoshi">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-white border border-gray-200 w-12 h-12 rounded-lg flex items-center justify-center">
            <Mail className="w-6 h-6 text-gray-700" />
          </div>
          <CardTitle className="text-xl text-gray-900 font-semibold pt-6">Check your email</CardTitle>
          <p className="text-sm text-gray-600">
            We sent a verification code to <span className="font-medium">{email || 'your email'}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-600 text-sm">
              Verification code sent successfully.
            </div>
          )}
          
          <div className="flex justify-center gap-2">
            {code.map((digit, index) => (
              <React.Fragment key={index}>
                <input
                  ref={el => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-12 text-center text-lg text-[#FD5C02] font-semibold border-2 rounded-lg focus:border-[#FD5C02] focus:outline-none"
                />
                {index === 2 && <span className="text-2xl text-gray-400">-</span>}
              </React.Fragment>
            ))}
          </div>
          
          <Button 
            className="w-full bg-[#FD5C02] hover:bg-orange-600 text-white text-sm lg:text-base px-4 py-3 font-medium rounded-md"
            onClick={handleVerify}
            disabled={code.some(digit => !digit) || loading}
          >
            {loading ? "Verifying..." : "Verify Email"}
          </Button>
          
          <div className="text-center pt-2">
            <p className="text-sm text-gray-600">
              Didn&apos;t receive the code?{" "}
              <button
                onClick={handleResendOTP}
                disabled={resendDisabled || loading}
                className={`text-[#FD5C02] font-medium hover:underline ${
                  resendDisabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {resendDisabled ? `Resend in ${countdown}s` : "Resend"}
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
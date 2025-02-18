"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

const VerificationCodeInput = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
  }, []);

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
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: { preventDefault: () => void; clipboardData: { getData: (arg0: string) => string | any[]; }; }) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6) as string;
    
    if (/^\d+$/.test(pastedData)) {
      const newCode = [...code];
      pastedData.split('').forEach((char, index) => {
        if (index < 6) newCode[index] = char;
      });
      setCode(newCode);
      
      // Focus last filled input or first empty input
      const lastIndex = Math.min(pastedData.length, 5);
      inputRefs.current[lastIndex]?.focus();
    }
  };

  const handleVerify = () => {
    const verificationCode = code.join('');
    // Here you would typically make an API call to verify the code
    console.log('Verifying code:', verificationCode);
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-10 lg:mt-16 font-satoshi">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto bg-white border border-gray-200 w-12 h-12 rounded-lg flex items-center justify-center">
          <Mail className="w-6 h-6 text-gray-700" />
        </div>
        <CardTitle className="text-xl text-gray-900 font-semibold pt-6">Check your email</CardTitle>
        <p className="text-sm text-gray-600">
          We sent a verification code to your mail
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
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
          className="flex justify-center bg-black text-white text-sm lg:text-base px-4 py-3 font-medium rounded-md mx-auto"	
          onClick={handleVerify}
          disabled={code.some(digit => !digit)}
        >
          Verify Email
        </Button>
      </CardContent>
    </Card>
  );
};

export default VerificationCodeInput;
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import Image from "next/image";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { FaArrowRight } from "react-icons/fa6";
import { Label } from "./ui/label";
import Link from "next/link";
// import { signIn } from "next-auth/react";
// import { useRouter } from "next/navigation";

const Login = () => {
  // const router = useRouter();
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  // const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   setIsLoading(true);
  //   setError(null);

  //   try {
  //     const result = await signIn("credentials", {
  //       email: formData.email,
  //       password: formData.password,
  //       isSignUp: "false",
  //       redirect: false,
  //     });

  //     if (result?.error) {
  //       setError(result.error);
  //       return;
  //     }

  //     router.push("/dashboard");
  //   } catch (error) {
  //     setError("An error occurred. Please try again.");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  return (
    <main className="relative overflow-hidden min-h-screen">
      <div className="absolute inset-0">
        <img
          src="/images/social-shake-bg.png"
          alt="Background Image"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="absolute inset-0 bg-black/50" />

      <div className="relative flex items-center justify-center px-4 py-6 xl:py-12 font-satoshi">
        <Card className="w-full max-w-xl bg-white border-2 border-[#FFBF9B] backdrop-blur-sm px-[2px] py-[6px] md:px-[30px] md:py-[5px] lg:px-[50px] lg:py-[5px]">
          <CardHeader className="space-y-3 items-center text-center">
            <div className="w-32 h-8 mb-8">
              <Image
                src="/images/logo.svg"
                alt="Social Shake logo"
                width={110}
                height={110}
              />
            </div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold lg:leading-10">
              Welcome Back
            </h1>
            <p className="w-full mb-5 text-sm md:text-base text-[#000] font-normal">
              Log in to connect with creators and track your brand&#39;s success.
            </p>
          </CardHeader>

          <CardContent className="space-y-3 md:space-y-4">
            <form >
              <div className="space-y-1">
                <Label htmlFor="email" className="text-sm md:text-lg font-medium">
                  Email*
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your business email"
                  className="w-full placeholder:text-sm md:placeholder:text-base md:py-5"
                />
              </div>

              <div className="space-y-1 pb-3 md:pb-5 mt-3">
                <Label htmlFor="password" className="text-sm md:text-lg font-medium">
                  Password*
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full placeholder:text-sm md:placeholder:text-base md:py-5"
                />
              </div>

              <Button 
                type="submit"
                disabled={isLoading}
                className={`w-full bg-[#FD5C02] hover:bg-orange-600 text-white text-[17px] py-5 font-normal ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Link href="/" className="flex items-center">
                  Log in
                  <FaArrowRight className="w-5 h-5 ml-2 mt-0.5" />
                </Link>
              </Button>

              {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
                  {error}
                </div>
              )}
            </form>

            <Link
              href="/forgot-password"
              className="flex justify-center items-center text-sm md:text-base text-[#000] hover:underline"
            >
              <p className="pt-1">Forgot Password?</p>
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Login;
"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import Image from "next/image";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { FaArrowRight, FaArrowLeft } from "react-icons/fa6";
import { Button } from "../ui/button";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface FormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

interface FieldErrors {
  [key: string]: string;
}

interface PasswordStrength {
  level: "weak" | "medium" | "strong";
  color: string;
}

const CreateCreatorAccount: React.FC = () => {
  const { signup, error: authError, clearError } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
  });
  
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [usernameChecking, setUsernameChecking] = useState<boolean>(false);
  const [emailChecking, setEmailChecking] = useState<boolean>(false);
  
  const usernameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Display auth error when it changes
  useEffect(() => {
    if (authError) {
      let errorMessage = authError;

      if (authError.includes("email-already-in-use")) {
        errorMessage = "This email address is already in use. Please log in instead.";
        setFieldErrors((prev) => ({
          ...prev,
          email: "This email address is already in use.",
        }));
      } else if (authError.includes("invalid-email")) {
        errorMessage = "Please enter a valid email address.";
        setFieldErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address.",
        }));
      } else if (authError.includes("weak-password")) {
        errorMessage = "Your password is too weak. Please choose a stronger password.";
        setFieldErrors((prev) => ({
          ...prev,
          password: "Please choose a stronger password.",
        }));
      }

      setFormError(errorMessage);
      setIsSubmitting(false);
    }
  }, [authError]);

  // Clear any timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current);
      }
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
    };
  }, []);

  // Clear form errors when inputs change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: value,
    });

    // Clear field-specific error when that field changes
    if (fieldErrors[id]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }

    // Clear general error message when any field changes
    if (formError) {
      setFormError(null);
    }

    // Clear auth errors when form changes
    if (authError) {
      clearError();
    }
  };

  // Check if username is available with debouncing
  useEffect(() => {
    // Clear any existing timeout
    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current);
      usernameCheckTimeoutRef.current = null;
    }

    if (!formData.username || formData.username.length < 3) return;

    usernameCheckTimeoutRef.current = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const response = await fetch(
          `/api/check-username?username=${encodeURIComponent(formData.username)}`
        );
        
        const data = await response.json();

        if (!response.ok) {
          console.error("Username check error:", data.error);
          return;
        }

        if (data.exists) {
          setFieldErrors((prev) => ({
            ...prev,
            username: "This username is already taken. Please choose another one.",
          }));
        } else {
          // Clear username error if it exists
          setFieldErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.username;
            return newErrors;
          });
        }
      } catch (error) {
        console.error("Error checking username:", error);
      } finally {
        setUsernameChecking(false);
      }
    }, 500); // 500ms debounce

    return () => {
      // Clean up timeout
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current);
      }
    };
  }, [formData.username]);

  // Check if email is already registered with debouncing
  useEffect(() => {
    // Clear any existing timeout
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
      emailCheckTimeoutRef.current = null;
    }

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) return;

    emailCheckTimeoutRef.current = setTimeout(async () => {
      setEmailChecking(true);
      try {
        const response = await fetch(
          `/api/check-email?email=${encodeURIComponent(formData.email)}`
        );
        
        const data = await response.json();

        if (!response.ok) {
          console.error("Email check error:", data.error);
          return;
        }

        if (data.exists) {
          setFieldErrors((prev) => ({
            ...prev,
            email: "This email address is already in use. Please log in instead.",
          }));
        } else {
          // Clear email error if it exists
          setFieldErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.email;
            return newErrors;
          });
        }
      } catch (error) {
        console.error("Error checking email:", error);
      } finally {
        setEmailChecking(false);
      }
    }, 500); // 500ms debounce

    return () => {
      // Clean up timeout
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
    };
  }, [formData.email]);

  // Password strength indicator
  const getPasswordStrength = (): PasswordStrength | null => {
    if (!formData.password) return null;

    let strength = 0;
    if (formData.password.length >= 8) strength++;
    if (/[A-Z]/.test(formData.password)) strength++;
    if (/[a-z]/.test(formData.password)) strength++;
    if (/[0-9]/.test(formData.password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) strength++;

    if (strength <= 2) return { level: "weak", color: "bg-red-500" };
    if (strength <= 4) return { level: "medium", color: "bg-yellow-500" };
    return { level: "strong", color: "bg-green-500" };
  };
  
  const passwordStrength = getPasswordStrength();

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    let isValid = true;

    // Validate first name
    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
      isValid = false;
    }

    // Validate last name
    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required";
      isValid = false;
    }

    // Validate username
    if (!formData.username.trim()) {
      errors.username = "Username is required";
      isValid = false;
    } else if (formData.username.length < 3) {
      errors.username = "Username must be at least 3 characters";
      isValid = false;
    }

    // Validate email
    if (!formData.email.trim()) {
      errors.email = "Email is required";
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
      isValid = false;
    }

    // Enhanced password validation
    if (!formData.password) {
      errors.password = "Password is required";
      isValid = false;
    } else {
      const passwordChecks = {
        length: formData.password.length >= 8,
        hasUppercase: /[A-Z]/.test(formData.password),
        hasLowercase: /[a-z]/.test(formData.password),
        hasNumber: /[0-9]/.test(formData.password),
      };

      if (!passwordChecks.length) {
        errors.password = "Password must be at least 8 characters long";
        isValid = false;
      } else if (
        !(
          passwordChecks.hasUppercase &&
          passwordChecks.hasLowercase &&
          passwordChecks.hasNumber
        )
      ) {
        errors.password =
          "Password must include uppercase, lowercase, and numbers";
        isValid = false;
      }
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isSubmitting) return;

    // Clear previous errors
    setFormError(null);
    clearError();

    // Validate the form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Check for username availability
      const usernameResponse = await fetch(
        `/api/check-username?username=${encodeURIComponent(formData.username)}`
      );
      
      const usernameData = await usernameResponse.json();

      if (usernameData.exists) {
        setFieldErrors((prev) => ({
          ...prev,
          username: "This username is already taken. Please choose another one.",
        }));
        setIsSubmitting(false);
        return;
      }
      
      // Check for email availability
      const emailResponse = await fetch(
        `/api/check-email?email=${encodeURIComponent(formData.email)}`
      );
      
      const emailData = await emailResponse.json();
      
      if (emailData.exists) {
        setFieldErrors((prev) => ({
          ...prev,
          email: "This email address is already in use. Please log in instead.",
        }));
        setFormError("This email address is already in use. Please log in instead.");
        setIsSubmitting(false);
        return;
      }

      // First sign up with Firebase Authentication
      const signupResult = await signup(formData.email, formData.password);
      
      // Add null check for user before proceeding
      if (!signupResult || !signupResult.user) {
        throw new Error("Failed to create user account");
      }
      
      const { user } = signupResult;
      
      // Store creator data for profile completion if needed
      sessionStorage.setItem(
        "creatorSignupData",
        JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username,
          userId: user.uid,
        })
      );

      // Create creator profile
      const response = await fetch("/api/creator-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          username: formData.username.toLowerCase(), // Store lowercase for searching
          displayUsername: formData.username, // Preserve original casing for display
          userType: "creator",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create creator profile");
      }

      // Redirect after successful creation
      router.push("/creator/account-created");
      
    } catch (err) {
      console.error("Signup error:", err);
      if (err instanceof Error) {
        setFormError(err.message || "An error occurred during signup");
      } else {
        setFormError("An error occurred during signup");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine error message to display (prioritize auth error over form error)
  const displayError = authError || formError;

  return (
    <div className="relative min-h-screen overflow-y-auto">
      <div className="absolute inset-0">
        <Image
          src="/images/social-shake-bg.png"
          alt="Background Image"
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
          priority
          quality={100}
          loading="eager"
        />
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Signup Card */}
      <div className="relative flex items-center justify-center px-4 py-6 xl:py-8 font-satoshi">
        <Card className="w-full max-w-xl bg-white border-2 border-[#FFBF9B] backdrop-blur-sm px-[2px] py-[6px] md:px-[30px] md:py-[5px] lg:px-[50px] lg:py-[5px]">
          <Link href="/creator/signup">
            <FaArrowLeft className="w-5 h-5 absolute left-8 md:left-6 top-12 md:top-10" />
          </Link>
          <CardHeader className="space-y-2 items-center text-center">
            <div className="w-32 h-8 mb-8">
              <Image
                src="/images/logo.svg"
                alt="Social Shake logo"
                width={110}
                height={110}
              />
            </div>
            <h1 className="text-lg md:text-xl lg:text-2xl font-semibold ">
              Join Social Shake as a Creator
            </h1>
            <p className="mb-6 text-sm md:text-base text-[#000] font-normal">
              Sign up to connect with top brands, showcase your creativity, and
              get paid for your content.
            </p>
            <div className="flex space-x-1">
              <p className="text-gray-600 text-sm md:text-base">
                Already have an account?
              </p>
              <Link
                href="/login"
                className="text-[#FD5C02] hover:underline text-sm md:text-base"
              >
                Log in
              </Link>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 md:space-y-4">
            {/* General Form Error */}
            {displayError && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-md mb-4">
                <p className="text-sm">
                  {displayError}
                  {displayError.includes("already in use") && (
                    <>
                      {" "}
                      <Link
                        href="/login"
                        className="text-[#FD5C02] font-medium hover:underline"
                      >
                        Log in here
                      </Link>
                    </>
                  )}
                </p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} noValidate>
              {/* Name Fields Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Your First Name"
                    className={`w-full placeholder:text-sm py-3 ${
                      fieldErrors.firstName
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    required
                  />
                  {fieldErrors.firstName && (
                    <p className="text-red-500 text-sm mt-1">
                      {fieldErrors.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Your Last Name"
                    className={`w-full placeholder:text-sm py-3 ${
                      fieldErrors.lastName
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    required
                  />
                  {fieldErrors.lastName && (
                    <p className="text-red-500 text-sm mt-1">
                      {fieldErrors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Username Field */}
              <div className="space-y-1 mt-3 md:mt-4">
                <Label htmlFor="username" className="text-sm font-medium">
                  Username <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Your Preferred Username"
                    className={`w-full placeholder:text-sm py-3 ${
                      fieldErrors.username
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    required
                  />
                  {usernameChecking && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="inline-block h-5 w-5 animate-spin rounded-full border-t-2 border-b-2 border-solid border-orange-500 border-r-transparent"></div>
                    </div>
                  )}
                </div>
                {!fieldErrors.username && (
                  <p className="text-gray-600 text-sm font-normal pt-px">
                    This can be the same as your TikTok Username
                  </p>
                )}
                {fieldErrors.username && (
                  <p className="text-red-500 text-sm mt-1">
                    {fieldErrors.username}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-1 mt-3 md:mt-4">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your business email"
                    className={`w-full placeholder:text-sm py-3 ${
                      fieldErrors.email ? "border-red-500 focus:ring-red-500" : ""
                    }`}
                    required
                  />
                  {emailChecking && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="inline-block h-5 w-5 animate-spin rounded-full border-t-2 border-b-2 border-solid border-orange-500 border-r-transparent"></div>
                    </div>
                  )}
                </div>
                {fieldErrors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1 mt-3 md:mt-4">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  className={`w-full placeholder:text-sm py-3 ${
                    fieldErrors.password
                      ? "border-red-500 focus:ring-red-500"
                      : ""
                  }`}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
                
                {/* Password strength indicator */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength?.color || ""}`}
                        style={{
                          width: `${passwordStrength ? (passwordStrength.level === "weak" ? "33%" : passwordStrength.level === "medium" ? "66%" : "100%") : "0%"}`,
                        }}
                      ></div>
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        passwordStrength?.level === "weak"
                          ? "text-red-500"
                          : passwordStrength?.level === "medium"
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {passwordStrength?.level === "weak"
                        ? "Weak password"
                        : passwordStrength?.level === "medium"
                          ? "Medium strength"
                          : "Strong password"}
                    </p>
                  </div>
                )}

                {fieldErrors.password ? (
                  <p className="text-red-500 text-sm mt-1">
                    {fieldErrors.password}
                  </p>
                ) : (
                  <p className="text-gray-600 text-sm font-normal pt-px">
                    Must be at least 8 characters with uppercase, lowercase, and numbers.
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={
                  isSubmitting || 
                  Object.keys(fieldErrors).length > 0 ||
                  usernameChecking ||
                  emailChecking
                }
                className={`w-full bg-[#FD5C02] hover:bg-orange-600 text-white text-[17px] py-5 font-normal mt-6 ${
                  isSubmitting || 
                  Object.keys(fieldErrors).length > 0 ||
                  usernameChecking ||
                  emailChecking
                    ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="inline-block h-5 w-5 animate-spin rounded-full border-t-2 border-b-2 border-solid border-white border-r-transparent mr-2"></div>
                    <span>Creating account...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    Create Account
                    <FaArrowRight className="w-5 h-5 ml-2" />
                  </div>
                )}
              </Button>

              <p className="text-sm text-center text-[#000] pt-3">
                By signing up, you confirm that you have read and agree to our{" "}
                <Link href="#" className="text-[#FD5C02] underline">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="#" className="text-[#FD5C02] underline">
                  Terms of Use
                </Link>
                .
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateCreatorAccount;
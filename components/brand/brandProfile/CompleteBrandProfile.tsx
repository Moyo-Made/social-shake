"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Button } from "../../ui/button";
import { FaArrowRight } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBrandProfile } from "@/hooks/useBrandProfile";

interface BrandProfileData {
  brandName: string;
  phoneNumber: string;
  email: string;
  address: string;
  website: string;
  industry: string;
  logo: File | null;
  logoUrl?: string;
  marketingGoal: string;
  otherGoal?: string;
  socialMedia: {
    tiktok: string;
    instagram: string;
    facebook: string;
  };
  targetAudience: string;
  userId?: string;
}

interface ValidationErrors {
  brandName?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  industry?: string;
  marketingGoal?: string;
  socialMedia?: string;
  otherGoal?: string;
}

const BrandProfileForm = () => {
  const router = useRouter();
  const { user } = useAuth();
  const {
    brandProfile,
    loading,
    error: hookError,
    updateBrandProfile,
  } = useBrandProfile();

  // Initialize form state with empty values
  const [formData, setFormData] = useState<BrandProfileData>({
    brandName: "",
    phoneNumber: "",
    email: user?.email || "",
    address: "",
    website: "",
    industry: "",
    logo: null,
    marketingGoal: "",
    socialMedia: {
      tiktok: "",
      instagram: "",
      facebook: "",
    },
    targetAudience: "",
    userId: user?.uid,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Update form data when brandProfile is loaded
  useEffect(() => {
    if (brandProfile) {
      // Extract social media data from flattened structure or use defaults
      const socialMediaData = {
        facebook: brandProfile["socialMedia.facebook"] || "",
        instagram: brandProfile["socialMedia.instagram"] || "",
        tiktok: brandProfile["socialMedia.tiktok"] || "",
      };

      setFormData({
        brandName: brandProfile.brandName || "",
        phoneNumber: brandProfile.phoneNumber || "",
        email: brandProfile.email || user?.email || "",
        address: brandProfile.address || "",
        website: brandProfile.website || "",
        industry: brandProfile.industry || "",
        logo: null, // Reset file input
        logoUrl: brandProfile.logoUrl,
        marketingGoal: brandProfile.marketingGoal || "",
        otherGoal: brandProfile.otherGoal || "",
        socialMedia: socialMediaData,
        targetAudience: brandProfile.targetAudience || "",
        userId: user?.uid,
      });

      // Set logo preview if available
      if (brandProfile.logoUrl) {
        setLogoPreview(brandProfile.logoUrl);
      }
    }
  }, [brandProfile, user]);

  // Set error from hook
  useEffect(() => {
    if (hookError) {
      setError(hookError);
    }
  }, [hookError]);

  // Validate form on change
  useEffect(() => {
    validateForm();
  }, [formData]);

  const validateForm = () => {
    const errors: ValidationErrors = {};

    // Brand Name validation
    if (!formData.brandName.trim()) {
      errors.brandName = "Brand name is required";
    }

    // Phone Number validation
    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = "Phone number is required";
    } else if (!/^\d{7,15}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
      errors.phoneNumber = "Please enter a valid phone number";
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Address validation
    if (!formData.address.trim()) {
      errors.address = "Company address is required";
    }

    // Industry validation
    if (!formData.industry) {
      errors.industry = "Please select your industry";
    }

    // Marketing Goal validation
    if (!formData.marketingGoal) {
      errors.marketingGoal = "Please select a marketing goal";
    } else if (formData.marketingGoal === "other" && !formData.otherGoal?.trim()) {
      errors.otherGoal = "Please specify your marketing goal";
    }

    // Social Media validation - at least one should be provided
    const hasSocialMedia = Object.values(formData.socialMedia).some(handle => handle.trim().length > 0);
    if (!hasSocialMedia) {
      errors.socialMedia = "Please provide at least one social media handle";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDrag = (e: {
    preventDefault: () => void;
    stopPropagation: () => void;
    type: string;
  }) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setFormData((prevData) => ({ ...prevData, logo: file }));

      // Create a preview URL for the image
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFormData((prevData) => ({ ...prevData, logo: file }));

      // Create a preview URL for the image
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  // Handle input blur to track touched fields
  const handleBlur = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "tiktok" || name === "instagram" || name === "facebook") {
      setFormData((prevData) => ({
        ...prevData,
        socialMedia: {
          ...prevData.socialMedia,
          [name]: value,
        },
      }));
      setTouched((prev) => ({ ...prev, socialMedia: true }));
    } else if (name === "otherGoal") {
      setFormData((prevData) => ({
        ...prevData,
        otherGoal: value,
      }));
      setTouched((prev) => ({ ...prev, otherGoal: true }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
      setTouched((prev) => ({ ...prev, [name]: true }));
    }
  };

  // Handle select changes
  const handleSelectChange = (value: string, name: string) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched for validation
    const allFields = {
      brandName: true,
      phoneNumber: true,
      email: true,
      address: true,
      industry: true,
      marketingGoal: true,
      socialMedia: true,
      otherGoal: formData.marketingGoal === "other",
    };
    setTouched(allFields);

    // Validate form
    const isValid = validateForm();
    if (!isValid) {
      setError("Please correct the errors in the form.");
      // Scroll to the first error
      const firstErrorField = Object.keys(validationErrors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Create FormData object for the entire submission
      const formDataToSubmit = new FormData();

      // Add all form fields except logo and socialMedia
      Object.entries(formData).forEach(([key, value]) => {
        if (
          key !== "logo" &&
          key !== "socialMedia" &&
          value !== null &&
          value !== undefined
        ) {
          formDataToSubmit.append(key, value as string);
        }
      });

      // Add social media fields properly
      formDataToSubmit.append(
        "socialMedia.tiktok",
        formData.socialMedia.tiktok || ""
      );
      formDataToSubmit.append(
        "socialMedia.instagram",
        formData.socialMedia.instagram || ""
      );
      formDataToSubmit.append(
        "socialMedia.facebook",
        formData.socialMedia.facebook || ""
      );

      // Add userId if available
      if (user?.uid) {
        formDataToSubmit.append("userId", user.uid);
      }

      // Add logo if selected
      if (selectedFile) {
        formDataToSubmit.append("logo", selectedFile);
      }

      // Use the updateBrandProfile function from the hook
      const result = await updateBrandProfile(formDataToSubmit);

      if (!result.success) {
        throw new Error(result.error || "Failed to save brand profile");
      }

      // Success handling
      // Store basic brand info in localStorage for immediate use
      localStorage.setItem("brandName", formData.brandName);
      if (logoPreview) localStorage.setItem("brandLogo", logoPreview);

      router.push("/brand/pricing");
    } catch (error) {
      console.error("Submission error:", error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-12 font-satoshi">
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Helper function to show error message
  const ErrorMessage = ({ name }: { name: keyof ValidationErrors }) => {
    if (touched[name] && validationErrors[name]) {
      return <p className="text-red-500 text-sm mt-1">{validationErrors[name]}</p>;
    }
    return null;
  };

  return (
    <>
      <div className="w-full border-t border-[#1A1A1A]" />
      <div className="w-full max-w-2xl mx-auto p-12 font-satoshi mb-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-bold">
              {formData.brandName
                ? "Update Your Brand Profile"
                : "Complete Your Brand Profile"}
            </h1>
            <p className="text-[#000] text-sm md:text-base font-normal">
              Help us understand your brand better by answering a few quick
              questions. This will allow us to tailor your experience and
              connect you with the best creators for your campaigns.
            </p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2" id="brandName">
              <Label className="text-sm md:text-base font-medium">
                What&#39;s the name of your brand or company? <span className="text-red-500">*</span>
              </Label>
              <Input
                name="brandName"
                value={formData.brandName}
                onChange={handleInputChange}
                onBlur={() => handleBlur("brandName")}
                placeholder="Social Shake"
                className={touched.brandName && validationErrors.brandName ? "border-red-500" : ""}
              />
              <ErrorMessage name="brandName" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2" id="phoneNumber">
                <Label className="text-sm md:text-base font-medium">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur("phoneNumber")}
                  placeholder="234523563"
                  className={touched.phoneNumber && validationErrors.phoneNumber ? "border-red-500" : ""}
                />
                <ErrorMessage name="phoneNumber" />
              </div>
              <div className="space-y-2" id="email">
                <Label className="text-sm md:text-base font-medium">
                  Company Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur("email")}
                  placeholder="info@social-shake.com"
                  type="email"
                  className={touched.email && validationErrors.email ? "border-red-500" : ""}
                />
                <ErrorMessage name="email" />
              </div>
            </div>

            <div className="space-y-2" id="address">
              <Label className="text-sm md:text-base font-medium">
                Company Address <span className="text-red-500">*</span>
              </Label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                onBlur={() => handleBlur("address")}
                placeholder="50 Pitt Street, Sydney Harbour Marriott, Australia"
                className={touched.address && validationErrors.address ? "border-red-500" : ""}
              />
              <ErrorMessage name="address" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm md:text-base font-medium">
                Do you have a website? Share the URL.
              </Label>
              <Input
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="www.social-shake.com"
              />
            </div>

            <div className="space-y-2" id="industry">
              <Label className="text-sm md:text-base font-medium">
                What is your industry type? <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.industry}
                onValueChange={(value) => handleSelectChange(value, "industry")}
              >
                <SelectTrigger className={touched.industry && validationErrors.industry ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select Industry" />
                </SelectTrigger>
                <SelectContent className="bg-[#f7f7f7]">
                  <SelectItem value="tech">Technology</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="food">Food & Beverage</SelectItem>
                  <SelectItem value="fashion">Fashion</SelectItem>
                  <SelectItem value="health">Health & Wellness</SelectItem>
                </SelectContent>
              </Select>
              <ErrorMessage name="industry" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm md:text-base font-medium">
                Upload your Brand Logo
              </Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer",
                  dragActive
                    ? "border-[#FD5C02] bg-orange-50"
                    : "border-gray-300",
                  selectedFile || logoPreview
                    ? "border-green-500 bg-green-50"
                    : ""
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                {selectedFile || logoPreview ? (
                  <div className="flex flex-col items-center">
                    {logoPreview && (
                      <div className="mb-2">
                        <Image
                          src={logoPreview}
                          alt="Logo Preview"
                          className="h-20 w-auto object-contain mx-auto"
                          width={80}
                          height={80}
                        />
                      </div>
                    )}
                    <p className="text-green-600">
                      {selectedFile
                        ? `Selected: ${selectedFile.name}`
                        : "Logo uploaded"}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white border border-gray-200 rounded-lg py-1 px-2 w-12 mx-auto mb-2">
                      <Image
                        src="/icons/upload.svg"
                        alt="Upload"
                        width={40}
                        height={40}
                      />
                    </div>
                    <p className="text-gray-600 text-sm md:text-base">
                      <span className="text-[#FD5C02]">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      PNG or JPG (800x400px)
                    </p>
                  </>
                )}
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="space-y-2" id="marketingGoal">
              <Label className="text-sm md:text-base font-medium">
                What is your Primary Marketing Goal? <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                className="flex flex-wrap gap-3"
                value={formData.marketingGoal}
                onValueChange={(value) => {
                  setFormData((prevData) => ({
                    ...prevData,
                    marketingGoal: value,
                    // Clear otherGoal if not selecting "other"
                    otherGoal: value === "other" ? prevData.otherGoal : ""
                  }));
                  setTouched((prev) => ({ ...prev, marketingGoal: true }));
                }}
              >
                <div
                  className="flex items-center space-x-2 cursor-pointer border border-black px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
                  data-state={
                    formData.marketingGoal === "brand-awareness"
                      ? "checked"
                      : "unchecked"
                  }
                >
                  <RadioGroupItem
                    value="brand-awareness"
                    id="brand-awareness"
                  />
                  <Label htmlFor="brand-awareness">
                    Increase brand awareness
                  </Label>
                </div>
                <div
                  className="flex items-center space-x-2 cursor-pointer border border-black px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
                  data-state={
                    formData.marketingGoal === "drive-sales"
                      ? "checked"
                      : "unchecked"
                  }
                >
                  <RadioGroupItem value="drive-sales" id="drive-sales" />
                  <Label htmlFor="drive-sales" className="cursor-pointer">
                    Drive sales
                  </Label>
                </div>
                <div
                  className="flex items-center space-x-2 cursor-pointer border border-black px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
                  data-state={
                    formData.marketingGoal === "audience-engagement"
                      ? "checked"
                      : "unchecked"
                  }
                >
                  <RadioGroupItem
                    value="audience-engagement"
                    id="audience-engagement"
                  />
                  <Label
                    htmlFor="audience-engagement"
                    className="cursor-pointer"
                  >
                    Build audience engagement
                  </Label>
                </div>
                <div
                  className="flex items-center space-x-2 cursor-pointer border border-black px-4 py-2 rounded-md data-[state=checked]:bg-[#FD5C02] data-[state=checked]:text-white data-[state=checked]:border-none"
                  data-state={
                    formData.marketingGoal === "user-interaction"
                      ? "checked"
                      : "unchecked"
                  }
                >
                  <RadioGroupItem
                    value="user-interaction"
                    id="user-interaction"
                  />
                  <Label htmlFor="user-interaction" className="cursor-pointer">
                    Increase User Interaction
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="other"
                    id="other"
                    checked={formData.marketingGoal === "other"}
                    onChange={(e) => {
                      if ((e.target as HTMLInputElement).checked) {
                        setFormData((prevData) => ({
                          ...prevData,
                          marketingGoal: "other",
                        }));
                        setTouched((prev) => ({ ...prev, marketingGoal: true }));
                      }
                    }}
                  />
                  <Label htmlFor="other" className="cursor-pointer">
                    Other:
                  </Label>
                  <Input
                    name="otherGoal"
                    value={formData.otherGoal || ""}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur("otherGoal")}
                    placeholder="Please specify"
                    className={`w-40 ${
                      formData.marketingGoal === "other" && 
                      touched.otherGoal && 
                      validationErrors.otherGoal ? "border-red-500" : ""
                    }`}
                    disabled={formData.marketingGoal !== "other"}
                  />
                </div>
              </RadioGroup>
              <ErrorMessage name="marketingGoal" />
              {formData.marketingGoal === "other" && <ErrorMessage name="otherGoal" />}
            </div>

            <div className="space-y-2" id="socialMedia">
              <Label className="text-sm md:text-base font-medium">
                Social Media Handles <span className="text-red-500">*</span> (At least one required)
              </Label>
              <div className="relative">
                <Image
                  src="/icons/tiktok.svg"
                  alt="Tiktok"
                  width={4}
                  height={4}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
                />
                <Input
                  name="tiktok"
                  value={formData.socialMedia.tiktok}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur("socialMedia")}
                  placeholder="social_shake"
                  className={`pl-8 ${
                    touched.socialMedia && validationErrors.socialMedia ? "border-red-500" : ""
                  }`}
                />
              </div>
              <div className="relative">
                <Image
                  src="/icons/ig.svg"
                  alt="Instagram"
                  width={4}
                  height={4}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
                />
                <Input
                  name="instagram"
                  value={formData.socialMedia.instagram}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur("socialMedia")}
                  placeholder="social_shake"
                  className={`pl-8 ${
                    touched.socialMedia && validationErrors.socialMedia ? "border-red-500" : ""
                  }`}
                />
              </div>
              <div className="relative">
                <Image
                  src="/icons/facebook.svg"
                  alt="Facebook"
                  width={4}
                  height={4}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
                />
                <Input
                  name="facebook"
                  value={formData.socialMedia.facebook}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur("socialMedia")}
                  placeholder="social_shake"
                  className={`pl-8 ${
                    touched.socialMedia && validationErrors.socialMedia ? "border-red-500" : ""
                  }`}
                />
              </div>
              <ErrorMessage name="socialMedia" />
            </div>

            <div className="space-y-2">
              <Label className="text-sm md:text-base font-medium">
                Who is your target audience?
              </Label>
              <Input
                name="targetAudience"
                value={formData.targetAudience}
                onChange={handleInputChange}
                placeholder="Tech Enthusiasts"
                type="text"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              className="flex justify-end bg-[#FD5C02] hover:bg-orange-600 text-white text-[17px] py-5 font-normal"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  <p>
                    {formData.brandName
                      ? "Update Profile"
                      : "Submit Registration"}
                  </p>
                  <FaArrowRight className="w-5 h-5 ml-2 mt-1.5" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default BrandProfileForm;
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FaEdit, FaEnvelope, FaPhone, FaGlobe, FaMapMarkerAlt } from "react-icons/fa";
import { FaTiktok, FaInstagram, FaFacebook } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

// Interface for social media data
interface SocialMedia {
  facebook: string;
  instagram: string;
  tiktok: string;
}

// Interface for the profile data
interface BrandProfileData {
  brandName: string;
  phoneNumber: string;
  email: string;
  address: string;
  website: string;
  industry: string;
  logoUrl?: string;
  marketingGoal: string;
  otherGoal?: string;
  socialMedia: SocialMedia;
  targetAudience: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

// Interface for API response (flattened format)
interface BrandProfileResponse {
  brandName: string;
  phoneNumber: string;
  email: string;
  address: string;
  website: string;
  industry: string;
  logoUrl?: string;
  marketingGoal: string;
  otherGoal?: string;
  "socialMedia.facebook"?: string;
  "socialMedia.instagram"?: string;
  "socialMedia.tiktok"?: string;
  targetAudience: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

const BrandProfileDisplay: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<BrandProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrandProfile = async (): Promise<void> => {
      if (!user?.email) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/brand-profile?email=${user.email}`);

        if (!response.ok) {
          throw new Error("Failed to fetch profile data");
        }

        const data: BrandProfileResponse = await response.json();
        
        // Structure the social media data correctly
        const socialMedia: SocialMedia = {
          facebook: data["socialMedia.facebook"] || "",
          instagram: data["socialMedia.instagram"] || "",
          tiktok: data["socialMedia.tiktok"] || "",
        };

        setProfileData({
          ...data,
          socialMedia
        } as BrandProfileData);
      } catch (err) {
        console.error("Error fetching brand profile:", err);
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrandProfile();
  }, [user]);

  const handleEditProfile = (): void => {
    router.push("/complete-profile");
  };

  // Marketing goal display formatter
  const formatMarketingGoal = (goal: string): string => {
    if (!goal) return "";
    
    const goals: Record<string, string> = {
      "brand-awareness": "Increase Brand Awareness",
      "drive-sales": "Drive Sales",
      "audience-engagement": "Build Audience Engagement",
      "user-interaction": "Increase User Interaction",
      "other": profileData?.otherGoal || "Other"
    };
    
    return goals[goal] || goal;
  };

  // Industry formatter
  const formatIndustry = (industry: string): string => {
    if (!industry) return "";
    
    const industries: Record<string, string> = {
      "tech": "Technology",
      "retail": "Retail",
      "food": "Food & Beverage",
      "fashion": "Fashion",
      "health": "Health & Wellness"
    };
    
    return industries[industry] || industry;
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 font-satoshi">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-40 bg-gray-200 animate-pulse"></div>
          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 font-satoshi">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-8">
            <div className="text-red-500 mb-4 text-5xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Failed to Load Profile</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-[#FD5C02] hover:bg-orange-600 text-white"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 font-satoshi">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">No Profile Found</h3>
          <p className="text-gray-600 mb-6">You haven&apos;t created a brand profile yet.</p>
          <Button 
            onClick={() => router.push("/complete-profile")} 
            className="bg-[#FD5C02] hover:bg-orange-600 text-white"
          >
            Create Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 font-satoshi">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Brand Header - Accent colored section */}
        <div className="h-40 bg-gradient-to-r from-[#FD5C02] to-orange-400 relative">
          <div className="absolute bottom-0 right-0 p-4">
            <Button 
              onClick={handleEditProfile} 
              className="bg-white text-[#FD5C02] hover:bg-gray-100"
            >
              <FaEdit className="mr-2" /> Edit Profile
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* Brand Logo and Name */}
          <div className="flex flex-col md:flex-row items-start md:items-center mb-8">
            <div className="relative -mt-16 md:-mt-24 mb-4 md:mb-0 mr-0 md:mr-6">
              {profileData.logoUrl ? (
                <Image
                  src={profileData.logoUrl}
                  alt={profileData.brandName}
                  width={120}
                  height={120}
                  className="rounded-full border-4 border-white shadow-md h-24 w-24 md:h-32 md:w-32 object-cover bg-white"
                />
              ) : (
                <div className="rounded-full border-4 border-white shadow-md h-24 w-24 md:h-32 md:w-32 bg-gray-200 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-400">
                    {profileData.brandName?.charAt(0) || "B"}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{profileData.brandName}</h1>
              <p className="text-gray-600">{formatIndustry(profileData.industry)}</p>
            </div>
          </div>

          {/* Profile Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="bg-gray-50 p-5 rounded-lg">
              <h2 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-4">Contact Information</h2>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <FaEnvelope className="text-[#FD5C02] mt-1 mr-3" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-gray-600">{profileData.email}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <FaPhone className="text-[#FD5C02] mt-1 mr-3" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-gray-600">{profileData.phoneNumber}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <FaMapMarkerAlt className="text-[#FD5C02] mt-1 mr-3" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-gray-600">{profileData.address}</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <FaGlobe className="text-[#FD5C02] mt-1 mr-3" />
                  <div>
                    <p className="font-medium">Website</p>
                    <p className="text-gray-600">{profileData.website || "Not provided"}</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Marketing Info */}
            <div className="bg-gray-50 p-5 rounded-lg">
              <h2 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-4">Marketing Details</h2>
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Marketing Goal</p>
                  <div className="mt-1 inline-block bg-orange-100 text-[#FD5C02] px-3 py-1 rounded-full text-sm">
                    {formatMarketingGoal(profileData.marketingGoal)}
                  </div>
                </div>
                
                <div>
                  <p className="font-medium">Target Audience</p>
                  <p className="text-gray-600 mt-1">{profileData.targetAudience || "Not specified"}</p>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-gray-50 p-5 rounded-lg md:col-span-2">
              <h2 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-4">Social Media Presence</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {profileData.socialMedia?.tiktok && (
                  <div className="flex items-center p-3 bg-white rounded-lg shadow-sm">
                    <div className="rounded-full bg-black p-2 mr-3">
                      <FaTiktok className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">TikTok</p>
                      <p className="font-medium">@{profileData.socialMedia.tiktok}</p>
                    </div>
                  </div>
                )}
                
                {profileData.socialMedia?.instagram && (
                  <div className="flex items-center p-3 bg-white rounded-lg shadow-sm">
                    <div className="rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-2 mr-3">
                      <FaInstagram className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Instagram</p>
                      <p className="font-medium">@{profileData.socialMedia.instagram}</p>
                    </div>
                  </div>
                )}
                
                {profileData.socialMedia?.facebook && (
                  <div className="flex items-center p-3 bg-white rounded-lg shadow-sm">
                    <div className="rounded-full bg-blue-600 p-2 mr-3">
                      <FaFacebook className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Facebook</p>
                      <p className="font-medium">@{profileData.socialMedia.facebook}</p>
                    </div>
                  </div>
                )}
                
                {!profileData.socialMedia?.tiktok && 
                 !profileData.socialMedia?.instagram && 
                 !profileData.socialMedia?.facebook && (
                  <p className="col-span-3 text-gray-500 italic">No social media accounts linked</p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Information or Stats Section can be added here */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Profile created: {new Date(profileData.createdAt).toLocaleDateString()}
              {profileData.updatedAt && profileData.updatedAt !== profileData.createdAt && 
                ` • Last updated: ${new Date(profileData.updatedAt).toLocaleDateString()}`
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandProfileDisplay;
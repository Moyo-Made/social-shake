"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CreatorProfile, useCreatorProfile } from "@/hooks/useCreatorProfile";

interface CreatorProfileDropdownProps {
  dropdownPosition?: "header" | "sidenav";
  creatorProfile: CreatorProfile;
}

const CreatorProfileDropdown: React.FC<CreatorProfileDropdownProps> = ({
  dropdownPosition = "header",
}) => {
  // Use the hook with complete profile data access - note we're NOT manually refreshing
  const { 
    creatorProfile, 
    loading, 
    error,
    refreshCreatorProfile
  } = useCreatorProfile("view");

  useEffect(() => {
    console.log("Current creator profile data:", creatorProfile);
  }, [creatorProfile]);

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();
  const router = useRouter();

  // Function to get creator initials from whatever data is available
  const getCreatorInitials = () => {
    // First try to use name if available
    if (creatorProfile?.displayUsername) {
      const words = creatorProfile.displayUsername.split(" ");
      if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
      }
      return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
    }
    
    // Then try email
    if (creatorProfile?.email) {
      // Extract first letter of email username
      const emailParts = creatorProfile.email.split('@');
      if (emailParts?.length > 0) {
        return emailParts[0].substring(0, 2).toUpperCase();
      }
    }
    
    // If no name or email but we have a bio, use first letters of first two words
    if (creatorProfile?.bio) {
      const words = creatorProfile.bio.split(" ");
      if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
      }
      return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
    }
    
    // Default initials
    return "CR";
  };

  // Get display name from available profile data
  const getDisplayName = () => {
    // First try verification data if available
    if (creatorProfile?.profileData?.fullName) {
      return creatorProfile.profileData.fullName as string;
    }
    
    // Then check displayUsername
    if (creatorProfile?.displayUsername) {
      return creatorProfile.displayUsername;
    }
    
    // Check email as fallback
    if (creatorProfile?.email) {
      // Extract username part of email
      const emailParts = creatorProfile.email.split('@');
      if (emailParts.length > 0) {
        return emailParts[0];
      }
    }
    
    return "Complete Your Profile";
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      router.push("/creator/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Get the content type label for display - prioritize profile data from verification
  const getContentTypeLabel = () => {
    // First check if we have contentType in profileData
    if (creatorProfile?.profileData?.contentType) {
      return creatorProfile.profileData.contentType as string;
    }
    
    // Then check if we have content categories
    if (creatorProfile?.profileData?.contentCategories && 
        Array.isArray(creatorProfile.profileData.contentCategories) && 
        creatorProfile.profileData.contentCategories.length > 0) {
      return (creatorProfile.profileData.contentCategories as string[])[0];
    }
    
    // Fallback to contentTypes array
    if (creatorProfile?.contentTypes && creatorProfile.contentTypes.length > 0) {
      return creatorProfile.contentTypes[0];
    }
    
    return "Content Creator";
  };

  // Get verification status badge info
  const getVerificationStatusInfo = () => {
    // Get status from verification data first, then fall back to profile data
    const status = creatorProfile?.status || creatorProfile?.verificationStatus;
    
    if (!status) return null;
    
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      submitted: "bg-blue-100 text-blue-800"
    };
    
    const statusColor = statusColors[status.toLowerCase() as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
    
    return {
      label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
      color: statusColor
    };
  };

  // Function to get profile picture from either source
  const getProfilePictureUrl = () => {
    // First try the standard profile picture URL
    if (creatorProfile?.profilePictureUrl) {
      return creatorProfile.profilePictureUrl;
    }
    
    // Then check if it's in the profileData
    if (creatorProfile?.profileData?.profilePictureUrl) {
      return creatorProfile.profileData.profilePictureUrl as string;
    }
    
    return null;
  };

  if (error) {
    return (
      <div className="text-red-500 text-sm flex items-center gap-2">
        <span>Error loading profile</span>
        <button 
          onClick={() => refreshCreatorProfile()}
          className="text-blue-500 underline"
        >
          Reload
        </button>
      </div>
    );
  }

  const profilePicture = getProfilePictureUrl();
  const verificationStatus = getVerificationStatusInfo();

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`flex items-center cursor-pointer ${
          dropdownPosition === "header"
            ? "gap-1"
            : "gap-3 justify-between w-full"
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {dropdownPosition === "sidenav" && (
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 overflow-hidden rounded-full">
              {loading ? (
                <div className="w-10 h-10 bg-gray-700 rounded-full animate-pulse"></div>
              ) : profilePicture ? (
                <Image
                  src={profilePicture}
                  alt={getDisplayName()}
                  className="w-full h-full object-cover"
                  width={40}
                  height={40}
                />
              ) : (
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                  {getCreatorInitials()}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-base font-bold">
                {loading ? "Loading..." : getDisplayName()}
              </h2>
              {creatorProfile?.email && (
                <p className="text-xs text-gray-400">{creatorProfile.email}</p>
              )}
            </div>
          </div>
        )}

        {dropdownPosition === "header" && (
          <>
            {loading ? (
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            ) : profilePicture ? (
              <Image
                src={profilePicture}
                alt={getDisplayName()}
                width={30}
                height={30}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {getCreatorInitials()}
              </div>
            )}
          </>
        )}

        <ChevronDown
          className={`h-4 w-4 ${
            dropdownPosition === "header" ? "text-gray-600" : "text-gray-300"
          } transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {isOpen && (
        <div
          className={`absolute z-10 ${
            dropdownPosition === "header"
              ? "right-0 mt-2 w-56 bg-white shadow-lg rounded-lg"
              : "left-0 bottom-full w-full bg-[#222] shadow-lg rounded-lg border border-gray-700"
          }`}
        >
          <div
            className={`px-4 py-3 border-b ${
              dropdownPosition === "header"
                ? "border-gray-200"
                : "border-gray-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <p
                className={`text-sm font-medium ${
                  dropdownPosition === "header" ? "text-gray-800" : "text-white"
                }`}
              >
                {getDisplayName()}
              </p>
              
              {verificationStatus && (
                <span className={`text-xs px-2 py-1 rounded-full ${verificationStatus.color}`}>
                  {verificationStatus.label}
                </span>
              )}
            </div>
            
            <p
              className={`text-xs ${
                dropdownPosition === "header"
                  ? "text-gray-500"
                  : "text-gray-400"
              }`}
            >
              {getContentTypeLabel()}
            </p>
      
          </div>

          <div className="py-1">
            <Link
              href="/creator/dashboard/settings"
              className={`flex items-center px-4 py-2 text-sm ${
                dropdownPosition === "header"
                  ? "text-gray-700 hover:bg-gray-100"
                  : "text-gray-200 hover:bg-gray-700"
              }`}
              onClick={() => setIsOpen(false)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Account Settings
            </Link>

  

            <button
              onClick={handleLogout}
              className={`flex items-center w-full text-left px-4 py-2 text-sm ${
                dropdownPosition === "header"
                  ? "text-red-600 hover:bg-gray-100"
                  : "text-red-400 hover:bg-gray-700"
              }`}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorProfileDropdown;
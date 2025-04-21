"use client";

import React from "react";
import Image from "next/image";
import { useAdminProfile } from "@/hooks/useAdminProfile";

interface AdminProfileProps {
  position?: "header" | "sidenav";
}

const AdminProfile: React.FC<AdminProfileProps> = ({
  position = "header",
}) => {
  const { adminProfile, loading } = useAdminProfile();

  // Function to get admin initials from email
  const getAdminInitials = () => {
    if (!adminProfile?.email) return "AD";
    
    // Get initials from the email username part
    const username = adminProfile.email.split("@")[0];
    
    // If username has dots or underscores, treat them as word separators
    const parts = username.split(/[._-]/);
    
    if (parts.length === 1) {
      return username.substring(0, 2).toUpperCase();
    }
    
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className={`flex items-center ${position === "header" ? "gap-1" : "gap-3 w-full"}`}>
      {position === "sidenav" && (
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 overflow-hidden rounded-full">
            {loading ? (
              <div className="w-10 h-10 bg-gray-700 rounded-full animate-pulse"></div>
            ) : adminProfile?.avatarUrl ? (
              <Image
                src={adminProfile.avatarUrl}
                alt="Admin Avatar"
                className="w-full h-full object-cover"
                width={40}
                height={40}
              />
            ) : (
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {getAdminInitials()}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-base font-bold">
              {loading ? "Loading..." : "Admin"}
            </h2>
            {adminProfile?.email && (
              <p className="text-xs text-gray-400">{adminProfile.email}</p>
            )}
          </div>
        </div>
      )}

      {position === "header" && (
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
          ) : adminProfile?.avatarUrl ? (
            <Image
              src={adminProfile.avatarUrl}
              alt="Admin Avatar"
              width={30}
              height={30}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {getAdminInitials()}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-medium">Admin</p>
            {adminProfile?.email && (
              <p className="text-xs text-gray-500">{adminProfile.email}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;
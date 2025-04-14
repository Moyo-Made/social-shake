"use client";

import { useState, useEffect } from "react";
import UserDashboard from "@/components/brand/brandProfile/dashboard/DashboardOverview";
import SideNavLayout from "@/components/brand/brandProfile/dashboard/SideNav";
import { useAuth } from "@/context/AuthContext";
import BrandContentWrapper from "@/components/brand/brandProfile/BrandContentWrapper";
import ProtectedRoute from "@/components/brand/brandProfile/ProtectedRoute";

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  
  // Simply use the currentUser directly
  useEffect(() => {
    // Just need to set loading to false once we've confirmed auth state
    setIsLoading(false);
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-t-2 border-b-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">User not found. Please log in.</p>
      </div>
    );
  }

  return (
    <SideNavLayout>
      <div className="p-6">
        <ProtectedRoute>
          <BrandContentWrapper userId={currentUser.uid} pageType="dashboard">
            <UserDashboard userId={currentUser.uid} />
          </BrandContentWrapper>
        </ProtectedRoute>
      </div>
    </SideNavLayout>
  );
}
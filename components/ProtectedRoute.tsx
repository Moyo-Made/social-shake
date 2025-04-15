"use client"

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check authentication status after loading is complete
    if (!isLoading) {
      if (currentUser) {
        setIsAuthorized(true);
      } else {
        // Redirect to login if no authenticated user
        router.replace('/');
      }
    }
  }, [currentUser, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
      <p>Loading dashboard...</p>
    </div>;
  }

  // Only render children if user is authenticated
  return isAuthorized ? children : null;
}
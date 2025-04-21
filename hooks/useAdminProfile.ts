import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; 
interface AdminProfileData {
  email?: string;
  role?: string;
  avatarUrl?: string;
  userId?: string;
}

export const useAdminProfile = () => {
  const [adminProfile, setAdminProfile] = useState<AdminProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth(); 

  useEffect(() => {
    const fetchAdminProfile = async () => {
      if (!currentUser || !currentUser.email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/admin-profile?email=${encodeURIComponent(currentUser.email)}&userId=${encodeURIComponent(currentUser.uid)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch admin profile');
        }

        const profileData = await response.json();
        setAdminProfile(profileData);
        setError(null);
      } catch (err) {
        console.error('Error fetching admin profile:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setAdminProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminProfile();
  }, [currentUser]);

  return { adminProfile, loading, error };
};
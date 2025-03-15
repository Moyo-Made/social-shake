import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface BrandProfile {
  brandName: string;
  logoUrl?: string;
  industry: string;
  targetAudience: string;
  [key: string]: string | undefined;
}

export const useBrandProfile = () => {
  const { user } = useAuth();
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrandProfile = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch from API (which uses Admin SDK)
      const apiUrl = `/api/brand-profile?email=${encodeURIComponent(user.email)}`;
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json() as BrandProfile;
        setBrandProfile(data);
        setLoading(false);
        return;
      }
      
      // Fallback to Firestore client SDK if API fails
      const brandRef = doc(db, 'brandProfiles', user.email);
      const docSnap = await getDoc(brandRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as BrandProfile;
        setBrandProfile(data);
      } else {
        setBrandProfile(null);
      }
    } catch (err) {
      console.error('Error fetching brand profile:', err);
      setError('Failed to fetch brand profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandProfile();
  }, [user]);

  const updateBrandProfile = async (formData: FormData) => {
    if (!user?.email) {
      setError('User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    try {
      setLoading(true);
      // Make sure email is in the form data
      formData.append('email', user.email);

      const response = await fetch('/api/brand-profile', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
      });

      const result = await response.json();

      if (response.ok) {
        // Refresh profile data after successful update
        await fetchBrandProfile();
        return { success: true, data: result.data };
      } else {
        setError(result.error || 'Failed to update brand profile');
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update brand profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Return the fetch and update functions
  return { 
    brandProfile, 
    loading, 
    error, 
    refreshBrandProfile: fetchBrandProfile,
    updateBrandProfile
  };
};
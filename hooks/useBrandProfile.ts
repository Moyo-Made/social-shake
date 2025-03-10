import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface BrandProfile {
  brandName: string;
  logoUrl?: string;
  industry: string;
  targetAudience: string;
}

export const useBrandProfile = () => {
  const { user } = useAuth();
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBrandProfile = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        // First check localStorage for immediate use
        const localBrandName = localStorage.getItem('brandName');
        const localBrandLogo = localStorage.getItem('brandLogo');
        
        if (localBrandName && localBrandLogo) {
          setBrandProfile({
            brandName: localBrandName,
            logoUrl: localBrandLogo,
            industry: '',
            targetAudience: '',
          });
        }

        // Then fetch from Firestore for complete data
        const brandRef = doc(db, 'brandProfiles', user.email);
        const docSnap = await getDoc(brandRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as BrandProfile;
          setBrandProfile(data);
          
          // Update localStorage
          localStorage.setItem('brandName', data.brandName);
          if (data.logoUrl) localStorage.setItem('brandLogo', data.logoUrl);
        } else if (!localBrandName) {
          // Only set to null if we don't have local data
          setBrandProfile(null);
        }
      } catch (err) {
        console.error('Error fetching brand profile:', err);
        setError('Failed to fetch brand profile');
      } finally {
        setLoading(false);
      }
    };

    fetchBrandProfile();
  }, [user]);

  return { brandProfile, loading, error };
};
import { Creators } from '@/types/Creator';
import { useState, useEffect } from 'react';

export const useSavedCreators = (userId: string) => {
  const [savedCreators, setSavedCreators] = useState<Creators[]>([]);
  const [allCreators, setAllCreators] = useState<Creators[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load saved creators from database on mount
  useEffect(() => {
    const loadSavedCreators = async () => {
      if (!userId) {
        setIsLoadingSaved(false);
        return;
      }

      setIsLoadingSaved(true);
      setError(null);
      
      try {
        // Pass the userId as a query parameter
        const response = await fetch(`/api/saved-creators?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error(`Error loading saved creators: ${response.status}`);
        }
        
        const data = await response.json();
        setSavedCreators(data.data || []); // Note: your API returns data.data, not data.savedCreators
      } catch (error) {
        console.error('Error loading saved creators:', error);
        setError('Failed to load saved creators');
        setSavedCreators([]); // Fallback to empty array
      } finally {
        setIsLoadingSaved(false);
      }
    };

    loadSavedCreators();
  }, [userId]); // Add userId as dependency

  // Fetch all creators from API
  useEffect(() => {
    const fetchAllCreators = async () => {
      setIsLoadingAll(true);
      setError(null);
      
      try {
        // Add pagination parameters to get ALL creators
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let allFetchedCreators: any[] = [];
        let page = 1;
        let hasMore = true;
        
        while (hasMore) {
          const url = `/api/admin/creator-approval?status=approved&page=${page}&limit=100`;
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Map the API response data to our Creator interface
          const mappedCreators = data.creators.map(
            (creator: {
              userId: string;
              firstName?: string;
              lastName?: string;
              username?: string;
              bio?: string;
              totalGMV?: number;
              avgGMVPerVideo?: number;
              pricing: {
                oneVideo?: number;
                threeVideos?: number;
                fiveVideos?: number;
                bulkVideos?: number;
                bulkVideosNote?: string;
              };
              logoUrl?: string;
              contentTypes?: string[];
              country?: string;
              socialMedia?: {
                tiktok?: string;
              };
              status?: string;
              dateOfBirth?: string;
              gender?: string;
              ethnicity?: string;
              contentLinks?: string[];
              verificationVideoUrl?: string;
              verifiableIDUrl?: string;
            }) => ({
              id: creator.userId,
              name: `${creator.firstName || ""} ${creator.lastName || ""}`.trim(),
              username: creator.username || "",
              bio: creator.bio || "",
              totalGMV: creator.totalGMV || 0, // Default to 0 instead of filtering out
              avgGMVPerVideo: creator.avgGMVPerVideo || 0,
              avgImpressions: "0",
              pricing: {
                oneVideo: creator.pricing?.oneVideo || 0,
                threeVideos: creator.pricing?.threeVideos || 0,
                fiveVideos: creator.pricing?.fiveVideos || 0,
                bulkVideos: creator.pricing?.bulkVideos || 0,
                bulkVideosNote: creator.pricing?.bulkVideosNote || "",
              },
              profilePictureUrl: creator.logoUrl || "/path/to/default-img.png",
              contentTypes: creator.contentTypes || [],
              country: creator.country || "",
              socialMedia: creator.socialMedia || {},
              tiktokUrl: creator.socialMedia?.tiktok || "",
              status: creator.status || "pending",
              dateOfBirth: creator.dateOfBirth || "",
              gender: creator.gender || "",
              ethnicity: creator.ethnicity || "",
              contentLinks: creator.contentLinks || [],
              verificationVideoUrl: creator.verificationVideoUrl || "",
              verifiableIDUrl: creator.verifiableIDUrl || "",
            })
          );
          
          allFetchedCreators = [...allFetchedCreators, ...mappedCreators];
          
          // Check if there are more pages (adjust this logic based on your API response structure)
          if (data.creators.length < 100 || !data.hasMore) {
            hasMore = false;
          } else {
            page++;
          }
        }
        
        // Remove the strict filtering - only filter out null/invalid creators
        const filteredCreators = allFetchedCreators.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (creator: any) => 
            creator !== null && 
            creator.id && // Only require that creator has an ID
            creator.name.trim() !== "" // And has a name
        );
        
        console.log(`Fetched ${filteredCreators.length} total creators`); // Debug log
        
        setAllCreators(filteredCreators);
      } catch (err) {
        console.error("Error fetching creators:", err);
        setError("Failed to load creators. Please try again later.");
      } finally {
        setIsLoadingAll(false);
      }
    };
    
    fetchAllCreators();
  }, []);

  // Check if a creator is saved
  const isCreatorSaved = (creatorId: string | number) => {
    return savedCreators.some((creator) => creator.id === creatorId);
  };

  // Save a creator to database
  const saveCreator = async (creator: Creators) => {
    if (isCreatorSaved(creator.id)) {
      return false; // Already saved
    }
    
    try {
      const response = await fetch('/api/saved-creators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          creatorId: creator.id,
          userId: userId // Pass the current user ID
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error saving creator: ${response.status}`);
      }
      
      // Update local state on successful save
      setSavedCreators([...savedCreators, creator]);
      return true;
    } catch (error) {
      console.error('Error saving creator:', error);
      setError('Failed to save creator');
      return false;
    }
  };

  // Remove a creator from database
  const removeCreator = async (creatorId: string | number) => {
    if (!isCreatorSaved(creatorId)) {
      return false; // Not saved
    }
    
    try {
      const response = await fetch(`/api/saved-creators/${creatorId}?userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Error removing creator: ${response.status}`);
      }
      
      // Update local state on successful removal
      setSavedCreators(savedCreators.filter((creator) => creator.id !== creatorId));
      return true;
    } catch (error) {
      console.error('Error removing creator:', error);
      setError('Failed to remove creator');
      return false;
    }
  };

  // Toggle saved status
  const toggleSavedStatus = async (creator: Creators) => {
    if (isCreatorSaved(creator.id)) {
      const success = await removeCreator(creator.id);
      return !success; // Return false if successfully removed
    } else {
      const success = await saveCreator(creator);
      return success; // Return true if successfully saved
    }
  };

  // Search creators (from both saved and all creators)
  const searchCreators = (query: string, searchAllCreators = false) => {
    if (!query.trim()) {
      return searchAllCreators ? allCreators : savedCreators;
    }
    
    const searchQuery = query.toLowerCase();
    const creatorsToSearch = searchAllCreators ? allCreators : savedCreators;
    
    const results = creatorsToSearch.filter(
      (creator) =>
        creator.name.toLowerCase().includes(searchQuery) ||
        (creator.username && creator.username.toLowerCase().includes(searchQuery))
    );
    
    console.log(`Search results: ${results.length} creators found for "${query}"`); // Debug log
    
    return results;
  };

  return {
    savedCreators,
    allCreators,
    isLoading: isLoadingSaved || isLoadingAll,
    isLoadingSaved,
    isLoadingAll,
    error,
    isCreatorSaved,
    saveCreator,
    removeCreator,
    toggleSavedStatus,
    searchCreators
  };
};
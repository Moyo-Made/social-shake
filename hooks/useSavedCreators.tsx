// hooks/useSavedCreators.js
import { Creators } from '@/components/brand/brandProfile/dashboard/creators/AllCreators';
import { useState, useEffect } from 'react';

export const useSavedCreators = () => {
  const [savedCreators, setSavedCreators] = useState<Creators[]>([]);
  const [allCreators, setAllCreators] = useState<Creators[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [isLoadingAll, setIsLoadingAll] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load saved creators from localStorage on mount
  useEffect(() => {
    const loadSavedCreators = () => {
      setIsLoadingSaved(true);
      try {
        const savedData = localStorage.getItem('savedCreators');
        if (savedData) {
          setSavedCreators(JSON.parse(savedData));
        }
      } catch (error) {
        console.error('Error loading saved creators:', error);
        // Reset localStorage if there's an error parsing the data
        localStorage.removeItem('savedCreators');
      } finally {
        setIsLoadingSaved(false);
      }
    };

    loadSavedCreators();
  }, []);

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

  // Save to localStorage whenever savedCreators changes
  useEffect(() => {
    if (!isLoadingSaved) {
      localStorage.setItem('savedCreators', JSON.stringify(savedCreators));
    }
  }, [savedCreators, isLoadingSaved]);

  // Check if a creator is saved
  const isCreatorSaved = (creatorId: string | number) => {
    return savedCreators.some((creator) => creator.id === creatorId);
  };

  // Save a creator
  const saveCreator = (creator: Creators) => {
    if (!isCreatorSaved(creator.id)) {
      setSavedCreators([...savedCreators, creator]);
      return true;
    }
    return false;
  };

  // Remove a creator
  const removeCreator = (creatorId: string | number) => {
    if (isCreatorSaved(creatorId)) {
      setSavedCreators(savedCreators.filter((creator) => creator.id !== creatorId));
      return true;
    }
    return false;
  };

  // Toggle saved status
  const toggleSavedStatus = (creator: Creators) => {
    if (isCreatorSaved(creator.id)) {
      removeCreator(creator.id);
      return false;
    } else {
      saveCreator(creator);
      return true;
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
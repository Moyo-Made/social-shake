import React, { useEffect, useState } from "react";
import ContestGridCard from "./CreatorContestGridCard";
import { useAuth } from "@/context/AuthContext";
import { Contest } from "@/types/contests";
import Link from "next/link";


export default function CreatorContestsGrid() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchCreatorContests = async () => {
      try {
        const userId = currentUser?.uid;
        
        // Fetch user contests directly from the API
        const response = await fetch(`/api/user-contests?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch creator's contests");
        }
        
        const data = await response.json();
        
        // Extract contests from the response
        const fetchedContests = data.contests || [];
        
        if (fetchedContests.length === 0) {
          setContests([]);
          setLoading(false);
          return;
        }
        
        setContests(fetchedContests);
      } catch (error) {
        console.error("Error fetching creator's contests:", error);
        setError("Failed to load your contests. Please try again later.");
        setContests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCreatorContests();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="text-red-500 text-center">
          <p className="text-xl font-semibold">Oops!</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">My Contests</h1>
        <Link href="/creator/dashboard/contest/all" className="bg-orange-500 hover:bg-orange-600 text-white text-sm py-2 px-4 rounded-lg transition-colors">
          Explore New Contests
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {contests.length > 0 ? (
          contests.map((contest) => (
            <ContestGridCard 
              key={contest.id} 
              contest={contest} 
            />
          ))
        ) : (
          <div className="col-span-2 text-center py-12 text-gray-500">
            <p className="mb-6">You haven&apos;t applied to any contests yet.</p>
            <Link href="/creator/dashboard/contest/all" className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg transition-colors">
              Browse Available Contests
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
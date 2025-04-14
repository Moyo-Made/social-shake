import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { db } from "@/config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

interface EmptyContestProps {
  userId: string;
}

const EmptyContest = ({ userId }: EmptyContestProps) => {
  const [brandApproved, setBrandApproved] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkBrandStatus() {
      if (!userId) return;
      
      try {
        const brandsRef = collection(db, "brandProfiles");
        const q = query(brandsRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          // No brand profile found
          setBrandApproved(false);
        } else {
          const brandData = querySnapshot.docs[0].data();
          setBrandApproved(brandData.status === "approved");
        }
      } catch (error) {
        console.error("Error fetching brand status:", error);
        setBrandApproved(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkBrandStatus();
  }, [userId]);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg border-gray-300 h-[400px] bg-gray-50">
      <div className="mb-6">
        <Image 
          src="/images/empty-contest.svg" 
          alt="No contests" 
          width={120} 
          height={120}
          className="opacity-80" 
        />
      </div>
      <h3 className="text-2xl font-bold mb-2">No Contests Yet!</h3>
      <p className="text-gray-600 max-w-md mb-6">
        Engage top creators and spark viral campaigns! Start a contest, set your requirements, and let creators compete to promote your brand.
      </p>
      
      {!isLoading && (
        <>
          {brandApproved ? (
            <Link href="/brand/contests/create">
              <Button className="flex items-center gap-1">
                Create Your First Contest <span className="ml-1">+</span>
              </Button>
            </Link>
          ) : (
            <Link href="/brand/profile">
              <Button variant="outline">
                Complete Brand Profile First
              </Button>
            </Link>
          )}
        </>
      )}
    </div>
  );
};

export default EmptyContest;
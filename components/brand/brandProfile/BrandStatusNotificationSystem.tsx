import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { db } from "@/config/firebase";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

interface BrandStatusContextType {
  status: string | null;
  isLoading: boolean;
}

const BrandStatusContext = createContext<BrandStatusContextType>({
  status: null,
  isLoading: true
});

export const useBrandStatus = () => useContext(BrandStatusContext);

interface BrandStatusProviderProps {
  userId: string | null;
  children: ReactNode;
}

export function BrandStatusProvider({ userId, children }: BrandStatusProviderProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchInitialStatus = async () => {
      try {
        const brandsRef = collection(db, "brandProfiles");
        const q = query(brandsRef, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setStatus("missing");
        } else {
          const brandData = querySnapshot.docs[0].data();
          setStatus(brandData.status || "pending");
          setPreviousStatus(brandData.status || "pending");
        }
      } catch (error) {
        console.error("Error fetching brand status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialStatus();

    // Set up real-time listener for brand status changes
    const brandsRef = collection(db, "brandProfiles");
    const q = query(brandsRef, where("userId", "==", userId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const brandData = snapshot.docs[0].data();
        const newStatus = brandData.status || "pending";
        
        // If status changed and it's not the first load, show a notification
        if (previousStatus && newStatus !== previousStatus) {
          if (newStatus === "approved") {
            toast({
              title: "Brand Profile Approved!",
              description: "You can now create contests and projects.",
              variant: "default",
              duration: 6000,
            });
          } else if (newStatus === "rejected") {
            toast({
              title: "Brand Profile Needs Updates",
              description: "Please review the feedback and update your profile.",
              variant: "destructive",
              duration: 6000,
            });
          }
        }
        
        setStatus(newStatus);
        setPreviousStatus(newStatus);
      }
    });

    return () => unsubscribe();
  }, [userId, toast, previousStatus]);

  return (
    <BrandStatusContext.Provider value={{ status, isLoading }}>
      {children}
      <Toaster />
    </BrandStatusContext.Provider>
  );
}

// Hook to access brand status and check permissions
export function useBrandPermissions() {
  const { status, isLoading } = useBrandStatus();
  
  return {
    isLoading,
    canCreateContent: status === "approved",
    needsProfile: status === "missing",
    isPending: status === "pending",
    isRejected: status === "rejected",
    status
  };
}
"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { BrandStatusProvider } from "@/components/brand/brandProfile/BrandStatusNotificationSystem";

import { ReactNode } from "react";

export default function BrandLayout({ children }: { children: ReactNode }) {
const [userId, setUserId] = useState<string | null>(null);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, [auth]);

  return (
    <BrandStatusProvider userId={userId}>
      {children}
    </BrandStatusProvider>
  );
}
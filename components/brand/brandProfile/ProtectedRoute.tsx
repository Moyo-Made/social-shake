"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

import { ReactNode } from "react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth(); 

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Alert className="max-w-md">
          <LogIn className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>Please log in to view your dashboard.</p>
            <div>
              <Link href="/brand/login">
                <Button>Log In</Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return children;
}
import { NextRequest, NextResponse } from "next/server";
import { db, storage } from "@/config/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function POST(request: NextRequest) {
  try {
    // To handle multipart/form-data (for file uploads)
    const formData = await request.formData();
    
    // Extract the file if present
    const imageFile = formData.get("image") as File | null;
    
    // Extract other form data
    const email = formData.get("email") as string;
    
    // Create an object from the form data, excluding the image file
    const formDataObj: Record<string, string | File> = {};
    formData.forEach((value, key) => {
      // Skip the image file in the data object
      if (key !== "image") {
        formDataObj[key] = value;
      }
    });

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Create a document reference with the email as ID
    const brandRef = doc(db, "brandProfiles", email);
    
    // Check if the document already exists
    const docSnap = await getDoc(brandRef);
    
    // Initialize the profile data
    const profileData: { updatedAt: string; createdAt: string; imageUrl?: string } = {
      ...formDataObj,
      updatedAt: new Date().toISOString(),
      createdAt: docSnap.exists() ? docSnap.data().createdAt : new Date().toISOString(),
    };
    
    // Handle image upload if a file was provided
    if (imageFile) {
      // Create a reference to the storage location
      const storageRef = ref(storage, `brand-images/${email}/${Date.now()}_${imageFile.name}`);
      
      // Convert File to ArrayBuffer for uploadBytes
      const buffer = await imageFile.arrayBuffer();
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, buffer);
      
      // Get the download URL
      const imageUrl = await getDownloadURL(snapshot.ref);
      
      // Add the image URL to the profile data
      profileData.imageUrl = imageUrl;
    }
    
    // Save to Firestore
    await setDoc(brandRef, profileData);

    return NextResponse.json({ 
      success: true, 
      message: "Brand profile saved successfully",
      data: profileData
    });
  } catch (error) {
    console.error("Error saving brand profile:", error);
    return NextResponse.json(
      { error: "Failed to save brand profile" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Get the document from Firestore
    const brandRef = doc(db, "brandProfiles", email);
    const docSnap = await getDoc(brandRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: "Brand profile not found" },
        { status: 404 }
      );
    }

    // Return the brand profile data
    return NextResponse.json(docSnap.data());
  } catch (error) {
    console.error("Error fetching brand profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand profile" },
      { status: 500 }
    );
  }
}
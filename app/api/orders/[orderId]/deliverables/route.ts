/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminAuth, adminDb } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getStorage } from "firebase-admin/storage";

// POST endpoint - Upload deliverable
export async function POST(
  request: NextRequest,
  { params }: any
) {
  try {
    // Await params if it's a Promise (Next.js 15+)
    const resolvedParams = await Promise.resolve(params);
    const { orderId } = resolvedParams;

    // Enhanced validation for orderId
    if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Parse FormData
    const formData = await request.formData();
    const videoFile = formData.get("video_file") as File;
    const videoId = formData.get("video_id") as string;
    const notes = formData.get("notes") as string;
    const status = formData.get("status") as string;
    const creatorId = formData.get("creatorId") as string;

    // Validate required fields
    if (!videoFile || !videoId || !status) {
      return NextResponse.json(
        { error: "video_file, video_id, and status are required" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'];
    if (!allowedTypes.includes(videoFile.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only video files are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (videoFile.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 100MB limit" },
        { status: 400 }
      );
    }

    if (!adminDb) {
      throw new Error("Firebase admin database is not initialized");
    }

    let orderDoc: any = null;
    let orderData: any = null;
    let isInternalIdQuery = false;

    // Try internal ID first (since your JSON data uses internal IDs)
    if (orderId.startsWith('order_')) {
      const ordersQuery = await adminDb
        .collection("orders")
        .where("id", "==", orderId)
        .limit(1)
        .get();

      if (!ordersQuery.empty) {
        orderDoc = ordersQuery.docs[0];
        orderData = orderDoc.data();
        isInternalIdQuery = true;
      }
    } else {
      // Try document ID if it doesn't look like an internal ID
      orderDoc = await adminDb.collection("orders").doc(orderId).get();
      if (orderDoc.exists) {
        orderData = orderDoc.data();
      }
    }

    // If still not found, try the other method
    if (!orderDoc || !orderDoc.exists) {
      if (isInternalIdQuery) {
        orderDoc = await adminDb.collection("orders").doc(orderId).get();
        if (orderDoc.exists) {
          orderData = orderDoc.data();
          isInternalIdQuery = false;
        }
      } else {
        const ordersQuery = await adminDb
          .collection("orders")
          .where("id", "==", orderId)
          .limit(1)
          .get();

        if (!ordersQuery.empty) {
          orderDoc = ordersQuery.docs[0];
          orderData = orderDoc.data();
          isInternalIdQuery = true;
        }
      }
    }

    if (!orderDoc || !orderDoc.exists || !orderData) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Normalize order data
    const normalizedOrderData = {
      user_id: orderData.user_id || orderData.userId,
      creator_id: orderData.creator_id || orderData.creatorId,
      status: orderData.status,
      brand_name: orderData.brand_name || orderData.brandName,
      brand_email: orderData.brand_email || orderData.brandEmail,
      package_type: orderData.package_type || orderData.packageType,
      video_count: orderData.video_count || orderData.videoCount,
      total_price: orderData.total_price || orderData.totalPrice,
    };

    // Verify creator has access to this order
    if (creatorId && normalizedOrderData.creator_id !== creatorId) {
      return NextResponse.json(
        { error: "Unauthorized: You can only upload deliverables for your assigned orders" },
        { status: 403 }
      );
    }

    // Check if order is in a valid state to upload deliverables
    const validStatuses = ['in_progress', 'pending_review', 'active', 'revision_requested'];
    if (!validStatuses.includes(normalizedOrderData.status)) {
      return NextResponse.json(
        { 
          error: `Cannot upload deliverables for order with status: ${normalizedOrderData.status}`,
          currentStatus: normalizedOrderData.status
        },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'deliverables');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch {
      console.log("Upload directory already exists or created");
    }

    // Generate unique filename
    const fileExtension = path.extname(videoFile.name);
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `${orderId}_${videoId}_${timestamp}_${randomString}${fileExtension}`;
    const filePath = path.join(uploadsDir, filename);
    const fileUrl = `/uploads/deliverables/${filename}`;

    // Convert File to Buffer and save
    const bytes = await videoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create deliverable document
    const deliverableId = Date.now();
    const deliverableData = {
      id: deliverableId,
      order_id: orderData.id || orderDoc.id,
      video_id: parseInt(videoId),
      original_filename: videoFile.name,
      file_url: fileUrl,
      file_size: videoFile.size,
      file_type: videoFile.type,
      notes: notes || "",
      status: status,
      created_at: new Date().toISOString(),
      creator_id: normalizedOrderData.creator_id,
      metadata: {
        upload_timestamp: timestamp,
        file_extension: fileExtension
      }
    };

    // Save deliverable to Firestore
    const deliverableDocRef = await adminDb.collection("deliverables").add(deliverableData);
    
    // Get brand information for notification
    let brandData = null;
    if (normalizedOrderData.user_id) {
      try {
        const userRecord = await adminAuth.getUser(normalizedOrderData.user_id);
        brandData = {
          brandName: userRecord.displayName || userRecord.email?.split('@')[0] || 'Unknown Brand',
          brandEmail: userRecord.email,
          userId: normalizedOrderData.user_id,
        };
      } catch (error) {
        console.error("Error fetching brand data:", error);
        brandData = {
          brandName: normalizedOrderData.brand_name || 'Unknown Brand',
          brandEmail: normalizedOrderData.brand_email || '',
          userId: normalizedOrderData.user_id,
        };
      }
    }

    // Get creator information
    let creatorInfo = null;
    if (normalizedOrderData.creator_id) {
      try {
        const creatorDoc = await adminDb
          .collection("creators")
          .doc(normalizedOrderData.creator_id)
          .get();
        if (creatorDoc.exists) {
          const creatorData = creatorDoc.data();
          creatorInfo = {
            id: creatorDoc.id,
            name: creatorData?.name || "Creator",
            email: creatorData?.email || "",
          };
        }
      } catch (error) {
        console.warn("Error fetching creator info:", error);
        creatorInfo = {
          id: normalizedOrderData.creator_id,
          name: "Creator",
          email: "",
        };
      }
    }

    // Create notification for the brand
    if (brandData && brandData.userId) {
      try {
        await adminDb.collection("notifications").add({
          userId: brandData.userId,
          message: `${creatorInfo?.name || 'Your creator'} has uploaded a deliverable for order #${orderData.id || orderDoc.id}.`,
          status: "unread",
          type: "deliverable_uploaded",
          createdAt: FieldValue.serverTimestamp(),
          relatedTo: "deliverable",
          orderId: orderData.id || orderDoc.id,
          deliverableId: deliverableId,
        });
      } catch (error) {
        console.error("Error creating notification:", error);
        // Don't fail the entire operation if notification fails
      }
    }

    // Create a milestone for deliverable uploaded
    try {
      const milestoneData = {
        id: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        order_id: orderData.id || orderDoc.id,
        type: "deliverable_uploaded",
        title: "Deliverable Uploaded",
        description: `${creatorInfo?.name || 'Creator'} has uploaded video ${videoId} (${videoFile.name})`,
        status: "completed",
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        creator_id: normalizedOrderData.creator_id,
        metadata: {
          deliverable_id: deliverableId,
          video_id: videoId,
          filename: videoFile.name,
          file_size: videoFile.size,
        }
      };

      await adminDb.collection("project_milestones").add(milestoneData);
    } catch (error) {
      console.error("Error creating milestone:", error);
      // Don't fail the entire operation if milestone creation fails
    }

    // Return success response
    return NextResponse.json({
      success: true,
      deliverable: {
        ...deliverableData,
        firestore_id: deliverableDocRef.id,
      },
    });

  } catch (error) {
    console.error("Error uploading deliverable:", error);
    return NextResponse.json(
      {
        error: "Failed to upload deliverable",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET endpoint - Retrieve deliverables for an order (Updated for Firebase Storage)
export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    // Await params if it's a Promise (Next.js 15+)
    const resolvedParams = await Promise.resolve(params);
    const { orderId } = resolvedParams;

    // Enhanced validation for orderId
    if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }


    if (!adminDb) {
      throw new Error("Firebase admin database is not initialized");
    }

    // Verify order exists first
    let orderDoc: any = null;
    let orderData: any = null;

    // Try internal ID first
    if (orderId.startsWith('order_')) {
      const ordersQuery = await adminDb
        .collection("orders")
        .where("id", "==", orderId)
        .limit(1)
        .get();

      if (!ordersQuery.empty) {
        orderDoc = ordersQuery.docs[0];
        orderData = orderDoc.data();
      }
    } else {
      // Try document ID
      orderDoc = await adminDb.collection("orders").doc(orderId).get();
      if (orderDoc.exists) {
        orderData = orderDoc.data();
      }
    }

    // If still not found, try the other method
    if (!orderDoc || !orderDoc.exists) {
      if (orderId.startsWith('order_')) {
        orderDoc = await adminDb.collection("orders").doc(orderId).get();
        if (orderDoc.exists) {
          orderData = orderDoc.data();
        }
      } else {
        const ordersQuery = await adminDb
          .collection("orders")
          .where("id", "==", orderId)
          .limit(1)
          .get();

        if (!ordersQuery.empty) {
          orderDoc = ordersQuery.docs[0];
          orderData = orderDoc.data();
        }
      }
    }

    if (!orderDoc || !orderDoc.exists || !orderData) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Get deliverables for this order
    const deliverableOrderId = orderData.id || orderDoc.id;
    const deliverablesQuery = await adminDb
      .collection("deliverables")
      .where("order_id", "==", deliverableOrderId)
      .orderBy("created_at", "desc")
      .get();

    const deliverables = await Promise.all(
      deliverablesQuery.docs.map(async (doc) => {
        const deliverableData = doc.data();
        
        // If the deliverable has a Firebase Storage path, generate a fresh signed URL
        if (deliverableData.file_storage_path) {
          try {
            const bucket = getStorage().bucket();
            const file = bucket.file(deliverableData.file_storage_path);
            
            // Check if file exists in storage
            const [exists] = await file.exists();
            if (exists) {
              // Generate a fresh signed URL (valid for 1 hour for security)
              const [freshDownloadUrl] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000 // 1 hour
              });
              
              return {
                firestore_id: doc.id,
                ...deliverableData,
                file_download_url: freshDownloadUrl, // Use fresh URL
                file_exists: true
              };
            } else {
              // File doesn't exist in storage
              return {
                firestore_id: doc.id,
                ...deliverableData,
                file_download_url: null,
                file_exists: false,
                error: "File not found in storage"
              };
            }
          } catch (error) {
            console.warn(`Error generating signed URL for deliverable ${doc.id}:`, error);
            return {
              firestore_id: doc.id,
              ...deliverableData,
              file_download_url: deliverableData.file_download_url, // Fallback to stored URL
              file_exists: false,
              error: "Could not generate download URL"
            };
          }
        } else {
          // Legacy deliverable with local file URL (from old system)
          return {
            firestore_id: doc.id,
            ...deliverableData,
            file_exists: deliverableData.file_url ? true : false,
            legacy: true // Flag to indicate this is from the old system
          };
        }
      })
    );

    // Filter out any null results and sort by creation date
    const validDeliverables = deliverables
      .filter(deliverable => deliverable !== null)

    return NextResponse.json({
      success: true,
      deliverables: validDeliverables,
      count: validDeliverables.length,
      storage_type: "firebase_storage" // Indicate the storage method
    });

  } catch (error) {
    console.error("Error fetching deliverables:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch deliverables",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
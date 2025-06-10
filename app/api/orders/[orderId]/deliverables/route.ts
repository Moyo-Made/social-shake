/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminAuth, adminDb, adminStorage } from "@/config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Configuration for chunked uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Each chunk should be under this size
    },
    responseLimit: false,
  },
};

// POST endpoint - Upload deliverable in chunks
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

    const body = await request.json();
    const {
      chunkData,
      fileName,
      fileContentType,
      chunkIndex,
      totalChunks,
      fileId,
      videoId,
      notes,
      status,
      creatorId,
      fileSize
    } = body;

    // Validate required fields for chunked upload
    if (!chunkData || !fileName || chunkIndex === undefined || !totalChunks || !videoId || !status) {
      return NextResponse.json(
        { error: "Missing required parameters for chunked upload" },
        { status: 400 }
      );
    }

    // Use provided fileId or generate a new one for the first chunk
    const currentFileId = fileId || `deliverable_${Date.now()}_${uuidv4()}`;

    console.log(`Uploading deliverable chunk ${chunkIndex + 1}/${totalChunks} for order ID: ${orderId}`);

    if (!adminDb || !adminStorage) {
      throw new Error("Firebase admin services are not initialized");
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime', 'video/webm'];
    if (fileContentType && !allowedTypes.includes(fileContentType)) {
      return NextResponse.json(
        { error: "Invalid file type. Only video files are allowed." },
        { status: 400 }
      );
    }

    // Validate total file size (500MB limit for chunked uploads)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 500MB limit" },
        { status: 400 }
      );
    }

    // For the first chunk, validate the order and create processing record
    if (chunkIndex === 0) {
      let orderDoc: any = null;
      let orderData: any = null;
      let isInternalIdQuery = false;

      // Try internal ID first (since your JSON data uses internal IDs)
      if (orderId.startsWith('order_')) {
        console.log("Querying by internal ID:", orderId);
        const ordersQuery = await adminDb
          .collection("orders")
          .where("id", "==", orderId)
          .limit(1)
          .get();

        if (!ordersQuery.empty) {
          orderDoc = ordersQuery.docs[0];
          orderData = orderDoc.data();
          isInternalIdQuery = true;
          console.log("Order found by internal ID");
        }
      } else {
        // Try document ID if it doesn't look like an internal ID
        console.log("Querying by document ID:", orderId);
        orderDoc = await adminDb.collection("orders").doc(orderId).get();
        if (orderDoc.exists) {
          orderData = orderDoc.data();
        }
      }

      // If still not found, try the other method
      if (!orderDoc || !orderDoc.exists) {
        if (isInternalIdQuery) {
          console.log("Internal ID failed, trying document ID...");
          orderDoc = await adminDb.collection("orders").doc(orderId).get();
          if (orderDoc.exists) {
            orderData = orderDoc.data();
            isInternalIdQuery = false;
          }
        } else {
          console.log("Document ID failed, trying internal ID...");
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

      // Create a record to track processing status
      const processingRef = adminDb.collection("deliverable_processing").doc(currentFileId);
      await processingRef.set({
        status: "uploading",
        orderId: orderData.id || orderDoc.id,
        videoId: parseInt(videoId),
        fileName,
        fileContentType,
        fileSize: fileSize || 0,
        totalChunks,
        uploadedChunks: 0,
        creatorId: normalizedOrderData.creator_id,
        notes: notes || "",
        deliverableStatus: status,
        startedAt: new Date(),
        lastUpdated: new Date(),
      });
    }

    // Generate temp storage path for this file's chunks
    const tempChunkPath = `temp/deliverables/${orderId}/${currentFileId}`;
    const bucket = adminStorage.bucket();
    
    // Save the chunk
    const chunkFileName = `${tempChunkPath}/chunk-${chunkIndex.toString().padStart(4, '0')}`;
    const chunkFileRef = bucket.file(chunkFileName);
    
    // Decode and save the chunk
    const chunkBuffer = Buffer.from(chunkData, "base64");
    await chunkFileRef.save(chunkBuffer, {
      metadata: {
        contentType: 'application/octet-stream',
      }
    });

    // Update processing record with chunk progress
    const processingRef = adminDb.collection("deliverable_processing").doc(currentFileId);
    await processingRef.update({
      uploadedChunks: chunkIndex + 1,
      lastUpdated: new Date(),
      [`chunk_${chunkIndex}_uploaded`]: true,
    });

    // If this is the last chunk, combine all chunks and create the deliverable
    if (chunkIndex === totalChunks - 1) {
      try {
        // Update status to processing
        await processingRef.update({
          status: "processing",
          processingStarted: new Date(),
        });

        // Get all chunks and sort them
        const [chunkFiles] = await bucket.getFiles({ prefix: tempChunkPath });
        chunkFiles.sort((a, b) => {
          const aIndex = parseInt(a.name.split('-').pop()?.replace(/\D/g, '') || '0');
          const bIndex = parseInt(b.name.split('-').pop()?.replace(/\D/g, '') || '0');
          return aIndex - bIndex;
        });

        // Verify we have all chunks
        if (chunkFiles.length !== totalChunks) {
          throw new Error(`Missing chunks. Expected ${totalChunks}, found ${chunkFiles.length}`);
        }

        // Generate unique filename for final deliverable
        const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const finalFileName = `deliverables/${orderId}/${videoId}_${timestamp}_${randomString}${fileExtension}`;
        const finalFileRef = bucket.file(finalFileName);

        // Create a write stream for the final file
        const writeStream = finalFileRef.createWriteStream({
          metadata: {
            contentType: fileContentType,
            customMetadata: {
              orderId: orderId,
              videoId: videoId.toString(),
              originalFileName: fileName,
              uploadedBy: creatorId || 'unknown',
            }
          }
        });

        // Process each chunk and append to final file
        for (let i = 0; i < chunkFiles.length; i++) {
          const chunkFile = chunkFiles[i];
          const [chunkData] = await chunkFile.download();
          writeStream.write(chunkData);
          
          // Update progress
          await processingRef.update({
            processingProgress: Math.round(((i + 1) / chunkFiles.length) * 100),
            lastUpdated: new Date(),
          });
        }

        // Close the write stream and wait for completion
        await new Promise<void>((resolve, reject) => {
          writeStream.end();
          writeStream.on('finish', () => resolve());
          writeStream.on('error', reject);
        });

        // Make the file publicly accessible
        await finalFileRef.makePublic();

        // Get the public URL
        const fileUrl = `https://storage.googleapis.com/${bucket.name}/${finalFileName}`;

        // Get processing record to retrieve metadata
        const processingDoc = await processingRef.get();
        const processingData = processingDoc.data();

        if (!processingData) {
          throw new Error("Processing data not found");
        }

        // Create deliverable document
        const deliverableId = Date.now();
        const deliverableData = {
          id: deliverableId,
          order_id: processingData.orderId,
          video_id: processingData.videoId,
          original_filename: fileName,
          file_url: fileUrl,
          file_size: fileSize || 0,
          file_type: fileContentType,
          notes: processingData.notes,
          status: processingData.deliverableStatus,
          created_at: new Date().toISOString(),
          creator_id: processingData.creatorId,
          metadata: {
            upload_timestamp: timestamp,
            file_extension: fileExtension,
            chunked_upload: true,
            total_chunks: totalChunks,
            processing_id: currentFileId,
          }
        };

        // Save deliverable to Firestore
        const deliverableDocRef = await adminDb.collection("deliverables").add(deliverableData);

        // Get order data for notifications
        const orderDoc = await adminDb.collection("orders").where("id", "==", processingData.orderId).limit(1).get();
        let orderData = null;
        if (!orderDoc.empty) {
          orderData = orderDoc.docs[0].data();
        }

        // Create notifications and milestones (similar to original code)
        if (orderData) {
          // Get brand information for notification
          let brandData = null;
          const normalizedOrderData = {
            user_id: orderData.user_id || orderData.userId,
            creator_id: orderData.creator_id || orderData.creatorId,
            brand_name: orderData.brand_name || orderData.brandName,
            brand_email: orderData.brand_email || orderData.brandEmail,
          };

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
                message: `${creatorInfo?.name || 'Your creator'} has uploaded a deliverable for order #${processingData.orderId}.`,
                status: "unread",
                type: "deliverable_uploaded",
                createdAt: FieldValue.serverTimestamp(),
                relatedTo: "deliverable",
                orderId: processingData.orderId,
                deliverableId: deliverableId,
              });
            } catch (error) {
              console.error("Error creating notification:", error);
            }
          }

          // Create a milestone for deliverable uploaded
          try {
            const milestoneData = {
              id: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              order_id: processingData.orderId,
              type: "deliverable_uploaded",
              title: "Deliverable Uploaded",
              description: `${creatorInfo?.name || 'Creator'} has uploaded video ${videoId} (${fileName})`,
              status: "completed",
              created_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              creator_id: processingData.creatorId,
              metadata: {
                deliverable_id: deliverableId,
                video_id: videoId,
                filename: fileName,
                file_size: fileSize || 0,
                chunked_upload: true,
              }
            };

            await adminDb.collection("project_milestones").add(milestoneData);
            console.log("Milestone created for deliverable upload");
          } catch (error) {
            console.error("Error creating milestone:", error);
          }
        }

        // Clean up temp chunks
        const deletePromises = chunkFiles.map(chunkFile => 
          chunkFile.delete().catch(err => console.warn("Failed to delete chunk:", err))
        );
        await Promise.allSettled(deletePromises);

        // Update processing status to completed
        await processingRef.update({
          status: "completed",
          completedAt: new Date(),
          fileUrl,
          deliverableId,
          firestoreId: deliverableDocRef.id,
        });

        return NextResponse.json({
          success: true,
          message: "Deliverable uploaded successfully",
          deliverable: {
            ...deliverableData,
            firestore_id: deliverableDocRef.id,
          },
          fileUrl,
          processingId: currentFileId,
        });

      } catch (error) {
        console.error("Error processing deliverable chunks:", error);
        
        // Update processing status to failed
        await processingRef.update({
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          failedAt: new Date(),
        });
        
        throw error;
      }
    } else {
      // Return progress information for non-final chunks
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      
      return NextResponse.json({
        success: true,
        message: `Chunk ${chunkIndex + 1} of ${totalChunks} uploaded successfully`,
        fileId: currentFileId,
        progress,
        chunkIndex: chunkIndex + 1,
        totalChunks,
      });
    }

  } catch (error) {
    console.error("Error uploading deliverable chunk:", error);
    return NextResponse.json(
      {
        error: "Failed to upload deliverable chunk",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// GET endpoint - Retrieve deliverables for an order OR check processing status
export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    // Await params if it's a Promise (Next.js 15+)
    const resolvedParams = await Promise.resolve(params);
    const { orderId } = resolvedParams;

    const { searchParams } = new URL(request.url);
    const processingId = searchParams.get('processingId');
    const checkStatus = searchParams.get('status');

    // If requesting processing status
    if (checkStatus === 'true' && processingId) {
      const processingDoc = await adminDb
        .collection("deliverable_processing")
        .doc(processingId)
        .get();
      
      if (!processingDoc.exists) {
        return NextResponse.json(
          { error: "Processing record not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        processing: processingDoc.data()
      });
    }

    // Enhanced validation for orderId
    if (!orderId || typeof orderId !== "string" || orderId.trim() === "") {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    console.log("Fetching deliverables for order ID:", orderId);

    if (!adminDb) {
      throw new Error("Firebase admin database is not initialized");
    }

    // Verify order exists first (same logic as before)
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

    const deliverables = deliverablesQuery.docs.map(doc => ({
      firestore_id: doc.id,
      ...doc.data()
    }));

    // Also get any ongoing processing records for this order
    const processingQuery = await adminDb
      .collection("deliverable_processing")
      .where("orderId", "==", deliverableOrderId)
      .where("status", "in", ["uploading", "processing"])
      .get();

    const ongoingUploads = processingQuery.docs.map(doc => ({
      processing_id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      deliverables: deliverables,
      ongoingUploads: ongoingUploads,
      count: deliverables.length,
      ongoingCount: ongoingUploads.length,
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

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
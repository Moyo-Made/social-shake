/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebase-admin";
import { getStorage } from "firebase-admin/storage";
import { FieldValue } from "firebase-admin/firestore";

interface ChunkData {
    chunkData: string;
    fileName: string;
    fileContentType: string;
    chunkIndex: number;
    totalChunks: number;
    fileId: string;
    videoId: number;
    notes: string;
    status: string;
    creatorId?: string;
    fileSize: number;
}

export async function POST(request: NextRequest, { params }: any) {
    try {
        // Await params if it's a Promise (Next.js 15+)
        const resolvedParams = await Promise.resolve(params);
        const { orderId } = resolvedParams;

        if (!orderId) {
            return NextResponse.json(
                { error: "Order ID is required" },
                { status: 400 }
            );
        }

        const requestData: ChunkData = await request.json();
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
        } = requestData;

        // Validate required fields
        if (!chunkData || !fileName || !fileId || chunkIndex === undefined || !totalChunks) {
            return NextResponse.json(
                { error: "Missing required fields for chunk upload" },
                { status: 400 }
            );
        }

        // Validate chunk index
        if (chunkIndex < 0 || chunkIndex >= totalChunks) {
            return NextResponse.json(
                { error: "Invalid chunk index" },
                { status: 400 }
            );
        }

        // Check if order exists (existing order validation code...)
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

        const actualOrderId = orderData.id || orderDoc.id;

        // Get Firebase Storage bucket
        const bucket = getStorage().bucket();
        
        // Store chunks as temporary files in Firebase Storage
        const chunkPath = `temp-chunks/${fileId}/chunk_${chunkIndex}`;
        const chunkFile = bucket.file(chunkPath);

        // Check if this chunk was already uploaded
        const [chunkExists] = await chunkFile.exists();
        if (chunkExists) {
            // Get current processing status
            const processingRef = adminDb.collection("deliverable_processing").doc(fileId);
            const processingDoc = await processingRef.get();
            const processingData = processingDoc.exists ? processingDoc.data() : { uploadedChunks: 0 };

            return NextResponse.json({
                success: true,
                message: "Chunk already uploaded",
                progress: Math.round(((processingData?.uploadedChunks || 0) / totalChunks) * 100),
                chunkIndex,
                uploadedChunks: processingData?.uploadedChunks || 0,
                totalChunks,
                deliverable: null
            });
        }

        // Convert base64 to buffer and save to Firebase Storage
        const chunkBuffer = Buffer.from(chunkData, 'base64');
        await chunkFile.save(chunkBuffer, {
            metadata: {
                contentType: 'application/octet-stream',
                metadata: {
                    fileId: fileId,
                    chunkIndex: chunkIndex.toString(),
                    fileName: fileName,
                    totalChunks: totalChunks.toString()
                }
            }
        });

        // Get or create processing record
        const processingRef = adminDb.collection("deliverable_processing").doc(fileId);
        const processingDoc = await processingRef.get();

        let processingData: any;

        if (!processingDoc.exists) {
            // Create new processing record
            processingData = {
                orderId: actualOrderId,
                fileId,
                fileName,
                fileSize,
                totalChunks,
                uploadedChunks: 1,
                status: 'uploading',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        } else {
            processingData = processingDoc.data();
            processingData.uploadedChunks = (processingData.uploadedChunks || 0) + 1;
            processingData.updatedAt = new Date().toISOString();
        }

        // Check if all chunks are uploaded
        const isComplete = processingData.uploadedChunks === totalChunks;

        if (isComplete) {
            processingData.status = 'processing';

            try {
                // Combine all chunks into a single file
                const finalFilePath = `deliverables/${actualOrderId}/${fileId}/${fileName}`;
                const finalFile = bucket.file(finalFilePath);

                // Read and combine all chunks in order
                const chunkBuffers: Buffer[] = [];
                
                for (let i = 0; i < totalChunks; i++) {
                    const chunkPath = `temp-chunks/${fileId}/chunk_${i}`;
                    const chunkFile = bucket.file(chunkPath);
                    
                    try {
                        const [chunkExists] = await chunkFile.exists();
                        if (!chunkExists) {
                            throw new Error(`Chunk ${i} not found at path: ${chunkPath}`);
                        }
                        
                        const [chunkBuffer] = await chunkFile.download();
                        chunkBuffers.push(chunkBuffer);
                    } catch (chunkError) {
                        console.error(`Error downloading chunk ${i}:`, chunkError);
                        throw new Error(`Failed to download chunk ${i}: ${chunkError}`);
                    }
                }

                // Combine all buffers
                const combinedBuffer = Buffer.concat(chunkBuffers);
                
                // Validate file size
                if (combinedBuffer.length !== fileSize) {
                    console.warn(`File size mismatch: expected ${fileSize}, got ${combinedBuffer.length}`);
                }

                // Upload the combined file to Firebase Storage
                await finalFile.save(combinedBuffer, {
                    metadata: {
                        contentType: fileContentType,
                        metadata: {
                            orderId: actualOrderId,
                            fileId: fileId,
                            videoId: videoId.toString(),
                            originalFileName: fileName,
                            uploadedAt: new Date().toISOString()
                        }
                    }
                });

                // Get the download URL
                const [downloadUrl] = await finalFile.getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
                });

                // Create the deliverable record with Firebase Storage reference
				const deliverableData = {
					id: `deliverable_${Date.now()}_${Math.random().toString(36).substring(2)}`,
					order_id: actualOrderId,
					video_id: videoId,
					file_name: fileName,
					file_size: fileSize,
					file_content_type: fileContentType,
					file_storage_path: finalFilePath,
					file_download_url: downloadUrl,
					notes: notes || "",
					status: status || "content_submitted",
					approval_status: "pending_review",
					creator_id: creatorId || orderData.creator_id,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
					processing_id: fileId,
					// Only add brand_id if it exists
					...(orderData.brand_id && { brand_id: orderData.brand_id })
				};
				

                // Save the deliverable to Firestore
                const deliverableRef = await adminDb
                    .collection("deliverables")
                    .add(deliverableData);

                // Add the Firestore document ID to the deliverable data
                const finalDeliverableData = {
                    firestore_id: deliverableRef.id,
                    ...deliverableData
                };

                // Update processing status to completed
                processingData.status = 'completed';
                await processingRef.set(processingData);

                // Clean up temporary chunk files
                try {
                    for (let i = 0; i < totalChunks; i++) {
                        const chunkPath = `temp-chunks/${fileId}/chunk_${i}`;
                        const chunkFile = bucket.file(chunkPath);
                        await chunkFile.delete();
                    }
                } catch (cleanupError) {
                    console.warn("Could not clean up temporary chunk files:", cleanupError);
                }

                // Update order status and send notification (existing code...)
                try {
                    await adminDb.collection("orders").doc(orderDoc.id).update({
                        status: 'content_submitted',
                        updated_at: new Date().toISOString(),
                        last_deliverable_at: new Date().toISOString()
                    });
                } catch (error) {
                    console.warn("Could not update order status:", error);
                }

                // Send notification to brand
                try {
                    if (orderData.brand_id) {
                        await adminDb.collection("notifications").add({
                            userId: orderData.brand_id,
                            message: `New deliverable submitted for order #${actualOrderId}. Please review and approve.`,
                            type: "deliverable_submitted",
                            status: "unread",
                            createdAt: FieldValue.serverTimestamp(),
                            relatedTo: "deliverable",
                            orderId: actualOrderId,
                            deliverableId: finalDeliverableData.id,
                        });
                    }
                } catch (error) {
                    console.warn("Could not send notification:", error);
                }

                return NextResponse.json({
                    success: true,
                    message: "File upload completed successfully",
                    progress: 100,
                    chunkIndex,
                    uploadedChunks: processingData.uploadedChunks,
                    totalChunks,
                    deliverable: finalDeliverableData,
                    processingId: fileId
                });

            } catch (error) {
                console.error("Error creating deliverable:", error);
                console.error("Error details:", {
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    fileId,
                    fileName,
                    totalChunks,
                    uploadedChunks: processingData.uploadedChunks
                });
                
                // Update processing status to failed with error details
                processingData.status = 'failed';
                processingData.error = error instanceof Error ? error.message : String(error);
                processingData.failedAt = new Date().toISOString();
                await processingRef.set(processingData);

                // Clean up temporary chunk files on failure
                try {
                    for (let i = 0; i < totalChunks; i++) {
                        const chunkPath = `temp-chunks/${fileId}/chunk_${i}`;
                        const chunkFile = bucket.file(chunkPath);
                        const [exists] = await chunkFile.exists();
                        if (exists) {
                            await chunkFile.delete();
                        }
                    }
                } catch (cleanupError) {
                    console.warn("Could not clean up temporary chunk files after failure:", cleanupError);
                }

                return NextResponse.json(
                    { 
                        error: "Failed to create deliverable record",
                        details: error instanceof Error ? error.message : String(error),
                        fileId: fileId
                    },
                    { status: 500 }
                );
            }
        } else {
            // Still uploading chunks
            await processingRef.set(processingData);

            return NextResponse.json({
                success: true,
                message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`,
                progress: Math.round((processingData.uploadedChunks / totalChunks) * 100),
                chunkIndex,
                uploadedChunks: processingData.uploadedChunks,
                totalChunks,
                deliverable: null,
                processingId: fileId
            });
        }

    } catch (error) {
        console.error("Error uploading deliverable:", error);
        return NextResponse.json(
            {
                error: "Failed to upload deliverable chunk",
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
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

// Define interfaces for type safety
interface PurchaseRequestBody {
  paymentId: string;
  videoId: string;
  userId: string;
  creatorId: string;
  amount: number | string;
  videoTitle: string;
  purchasedAt?: string;
  status: string;
}

interface PurchaseData {
  paymentId: string;
  videoId: string;
  userId: string;
  creatorId: string;
  amount: number;
  videoTitle: string;
  purchasedAt: string;
  status: string;
  downloadCount: number;
  createdAt: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json() as Partial<PurchaseRequestBody>;
    console.log('Received request body:', body);

    const {
      paymentId,
      videoId,
      userId,
      creatorId,
      amount,
      videoTitle,
      purchasedAt,
      status
    } = body;

    // Validate required fields with proper type checking
    const requiredFields = [
      { key: 'paymentId', value: paymentId },
      { key: 'videoId', value: videoId },
      { key: 'userId', value: userId },
      { key: 'creatorId', value: creatorId },
      { key: 'amount', value: amount },
      { key: 'videoTitle', value: videoTitle },
      { key: 'status', value: status }
    ];

    const missingFields = requiredFields
      .filter(({ value }) => value === undefined || value === null || value === '')
      .map(({ key }) => key);

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    // Additional type validation
    if (typeof paymentId !== 'string' || paymentId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'paymentId must be a non-empty string'
      }, { status: 400 });
    }

    if (typeof videoId !== 'string' || videoId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'videoId must be a non-empty string'
      }, { status: 400 });
    }

    if (typeof userId !== 'string' || userId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'userId must be a non-empty string'
      }, { status: 400 });
    }

    if (typeof creatorId !== 'string' || creatorId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'creatorId must be a non-empty string'
      }, { status: 400 });
    }

    if (typeof videoTitle !== 'string' || videoTitle.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'videoTitle must be a non-empty string'
      }, { status: 400 });
    }

    if (typeof status !== 'string' || status.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'status must be a non-empty string'
      }, { status: 400 });
    }

    // Validate amount
    let parsedAmount: number;
    if (typeof amount === 'number') {
      parsedAmount = amount;
    } else if (typeof amount === 'string') {
      parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount)) {
        return NextResponse.json({
          success: false,
          error: 'amount must be a valid number'
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'amount must be a number or numeric string'
      }, { status: 400 });
    }

    if (parsedAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'amount must be greater than 0'
      }, { status: 400 });
    }

    // Validate purchasedAt if provided
    let validPurchasedAt: string;
    if (purchasedAt) {
      if (typeof purchasedAt !== 'string') {
        return NextResponse.json({
          success: false,
          error: 'purchasedAt must be a valid ISO string'
        }, { status: 400 });
      }
      
      const purchasedDate = new Date(purchasedAt);
      if (isNaN(purchasedDate.getTime())) {
        return NextResponse.json({
          success: false,
          error: 'purchasedAt must be a valid date string'
        }, { status: 400 });
      }
      validPurchasedAt = purchasedDate.toISOString();
    } else {
      validPurchasedAt = new Date().toISOString();
    }

    // Test Firebase connection
    try {
      await adminDb.collection('purchases').limit(1).get();
      console.log('Firebase connection successful');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (firebaseError: any) {
      console.error('Firebase connection error:', firebaseError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed'
      }, { status: 500 });
    }

    // Check if purchase already exists
    console.log('Checking for existing purchase...');
    const existingPurchase = await adminDb
      .collection('purchases')
      .where('paymentId', '==', paymentId.trim())
      .where('userId', '==', userId.trim())
      .get();

    if (!existingPurchase.empty) {
      console.log('Purchase already exists:', existingPurchase.docs[0].id);
      return NextResponse.json({ 
        success: true, 
        message: 'Purchase already exists',
        purchaseId: existingPurchase.docs[0].id 
      });
    }

    // Create new purchase record with proper typing
    const purchaseData: PurchaseData = {
      paymentId: paymentId.trim(),
      videoId: videoId.trim(),
      userId: userId.trim(),
      creatorId: creatorId.trim(),
      amount: parsedAmount,
      videoTitle: videoTitle.trim(),
      purchasedAt: validPurchasedAt,
      status: status.trim(),
      downloadCount: 0,
      createdAt: new Date().toISOString(),
    };

    console.log('Creating purchase with data:', purchaseData);

    const purchaseRef = await adminDb.collection('purchases').add(purchaseData);
    console.log('Purchase created successfully:', purchaseRef.id);

    return NextResponse.json({
      success: true,
      purchaseId: purchaseRef.id,
      message: 'Purchase record created successfully'
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Detailed error creating purchase:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      code: error?.code
    });

    // More specific error handling
    if (error?.code === 'permission-denied') {
      return NextResponse.json({
        success: false,
        error: 'Database permission denied. Check Firebase rules.'
      }, { status: 403 });
    }

    if (error?.code === 'unavailable') {
      return NextResponse.json({
        success: false,
        error: 'Database temporarily unavailable. Please try again.'
      }, { status: 503 });
    }

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create purchase record',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    console.log(`Fetching purchased videos for userId: ${userId}`);
     
    // Query user's purchases, ordered by purchase date (most recent first)
    const query = adminDb.collection("purchases")
      .where("userId", "==", userId)
      .orderBy("purchasedAt", "desc");

    const snapshot = await query.get();
    
    if (snapshot.empty) {
      console.log(`No purchases found for userId: ${userId}`);
      return NextResponse.json({ purchasedVideos: [] });
    }

    // Get all unique video IDs for batch fetch
    const videoIds = snapshot.docs.map(doc => doc.data().videoId);
    const uniqueVideoIds = [...new Set(videoIds)];

    // Batch fetch video data from videos collection
    const videoDataMap = new Map();
    
    // Firestore batch read limit is 500, so we need to chunk if we have more
    const chunkSize = 500;
    for (let i = 0; i < uniqueVideoIds.length; i += chunkSize) {
      const chunk = uniqueVideoIds.slice(i, i + chunkSize);
      const videoPromises = chunk.map(videoId => 
        adminDb.collection("videos").doc(videoId).get()
      );
      
      const videoDocs = await Promise.all(videoPromises);
      
      videoDocs.forEach((doc, index) => {
        if (doc.exists) {
          videoDataMap.set(chunk[index], doc.data());
        }
      });
    }

    // Enrich purchases with data from the videos collection
    const enrichedVideos = snapshot.docs.map(doc => {
      const purchaseData = doc.data();
      const videoData = videoDataMap.get(purchaseData.videoId) || {};

      return {
        id: doc.id,
        videoId: purchaseData.videoId,
        userId: purchaseData.userId,
        creatorId: purchaseData.creatorId,
        paymentId: purchaseData.paymentId,
        purchasedAt: purchaseData.purchasedAt || null,
        amount: purchaseData.amount || 0,
        status: purchaseData.status || "completed",
        downloadCount: purchaseData.downloadCount || 0,
        // Video details from videos collection
        title: videoData.title || purchaseData.videoTitle || "Untitled",
        description: videoData.description || "",
        thumbnailUrl: videoData.thumbnailUrl || null,
        videoUrl: videoData.videoUrl || null,
        tags: videoData.tags || [],
        licenseType: videoData.licenseType || null,
        price: videoData.price || null,
        views: videoData.views || 0,
        purchases: videoData.purchases || 0,
        fileName: videoData.fileName || null,
        fileSize: videoData.fileSize || null,
        uploadedAt: videoData.uploadedAt?.toDate?.()?.toISOString() || null,
        creatorName: videoData.creatorName || "Unknown Creator",
      };
    });

    console.log(`Found ${enrichedVideos.length} purchased videos for userId: ${userId}`);
    return NextResponse.json({ purchasedVideos: enrichedVideos });

  } catch (error) {
    console.error("Error fetching purchased videos:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch purchased videos",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
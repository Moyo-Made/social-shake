import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Query conversations where the user is a participant
    const conversationsRef = db.collection('conversations');
    const snapshot = await conversationsRef
      .where('participants', 'array-contains', userId)
      .get();
    
    let totalUnread = 0;
    const conversationCounts: Record<string, number> = {};
    
    // Sum up all unread counts across all conversations
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // Ensure we're looking at the correct field path
      const unreadCount = data.unreadCounts?.[userId] || 0;
      totalUnread += unreadCount;
      conversationCounts[doc.id] = unreadCount;
    });
    
    return NextResponse.json({ 
      totalUnread: totalUnread,
      conversationCounts: conversationCounts
    }, { status: 200 });
    
  } catch (error: unknown) {
    console.error('Error fetching notification count:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    // Get the user ID from query parameters
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Query conversations where the user is a participant
    const conversationsRef = db.collection('conversations');
    const snapshot = await conversationsRef.where('participants', 'array-contains', userId).get();
    
    if (snapshot.empty) {
      return NextResponse.json({ conversations: [] }, { status: 200 });
    }
    
    // Transform the conversation documents to include only necessary data
    const conversations = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Convert Firebase timestamps to ISO strings for JSON serialization
      const updatedAt = data.updatedAt ? data.updatedAt.toDate().toISOString() : null;
      
      // Get unread count for this user (default to 0 if not present)
      const unreadCount = data.unreadCounts?.[userId] || 0;
      
      return {
        id: doc.id,
        participants: data.participants || [],
        participantsInfo: data.participantsInfo || {},
        lastMessage: data.lastMessage || '',
        updatedAt: updatedAt,
        unreadCount: unreadCount, // Include unread count
      };
    });
    
    // Sort conversations by updatedAt timestamp (newest first)
    conversations.sort((a, b) => {
      if (!a.updatedAt) return 1;
      if (!b.updatedAt) return -1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    
    return NextResponse.json({ conversations }, { status: 200 });
    
  } catch (error: unknown) {
    console.error('Error fetching conversations:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

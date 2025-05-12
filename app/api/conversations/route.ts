import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    // Get the user ID and creator filter from query parameters
    const userId = request.nextUrl.searchParams.get('userId');
    const creatorOnly = request.nextUrl.searchParams.get('creatorOnly') === 'true';
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Query conversations where the user is a participant
    const conversationsRef = db.collection('conversations');
    const baseQuery = conversationsRef.where('participants', 'array-contains', userId);
    
    // Fetch the conversations
    const snapshot = await baseQuery.get();
    
    if (snapshot.empty) {
      return NextResponse.json({ conversations: [] }, { status: 200 });
    }
    
    // Transform the conversation documents
    const conversations = snapshot.docs
      .map(doc => {
        const data = doc.data();
        
        // Check if this is a creator conversation
        const isCreatorConversation = Object.entries(data.participantsInfo || {}).some(
          ([participantId, participantInfo]) => 
            participantId !== userId && 
            typeof participantInfo === 'object' && participantInfo !== null && 'role' in participantInfo && (participantInfo as { role: string }).role === 'creator'
        );

        // If creatorOnly is true, only return creator conversations
        if (creatorOnly && !isCreatorConversation) {
          return null;
        }
        
        // Convert Firebase timestamps to ISO strings
        const updatedAt = data.updatedAt ? data.updatedAt.toDate().toISOString() : null;
        
        // Get unread count for this user (default to 0 if not present)
        const unreadCount = data.unreadCounts?.[userId] || 0;
        
        return {
          id: doc.id,
          participants: data.participants || [],
          participantsInfo: data.participantsInfo || {},
          lastMessage: data.lastMessage || '',
          updatedAt: updatedAt,
          unreadCount: unreadCount,
          isCreatorConversation // Optional: include this flag if needed
        };
      })
      .filter(Boolean); // Remove null entries from filtered results
    
    // Sort conversations by updatedAt timestamp (newest first)
    conversations.sort((a, b) => {
      if (!a || !a.updatedAt) return 1;
      if (!b || !b.updatedAt) return -1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    
    return NextResponse.json({ conversations }, { status: 200 });
    
  } catch (error: unknown) {
    console.error('Error fetching conversations:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
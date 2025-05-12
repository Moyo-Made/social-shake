import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    // Get the user ID from query parameters
    const userId = request.nextUrl.searchParams.get('userId');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '4', 10);
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Query conversations where the user is a participant
    const conversationsRef = db.collection('conversations');
    const snapshot = await conversationsRef
      .where('participants', 'array-contains', userId)
      .get();
    
    if (snapshot.empty) {
      return NextResponse.json({ messages: [] }, { status: 200 });
    }
    
    // Collect messages from conversations with a creator
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [];

    for (const doc of snapshot.docs) {
      const conversationData = doc.data();
      const conversationId = doc.id;

      // Check if the conversation has a creator
      const creatorParticipantId = Object.entries(conversationData.participantsInfo || {})
        .find(([id, info]) => 
          id !== userId && 
          typeof info === 'object' && 
          info !== null && 
          'role' in info && 
          (info as { role: string }).role === 'creator'
        )?.[0];

      // If no creator found, skip this conversation
      if (!creatorParticipantId) continue;

      // Fetch the most recent message
      const messagesRef = conversationsRef.doc(conversationId).collection('messages');
      const messageSnapshot = await messagesRef
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (!messageSnapshot.empty) {
        const messageDoc = messageSnapshot.docs[0];
        const messageData = messageDoc.data();
        
        // Skip messages sent by the current user
        if (messageData.sender === userId) continue;

        const creatorInfo = conversationData.participantsInfo?.[creatorParticipantId];

        messages.push({
          id: messageDoc.id,
          sender: messageData.sender,
          content: messageData.content,
          timestamp: messageData.timestamp?.toDate().toISOString(),
          conversationId: conversationId,
          senderInfo: {
            name: creatorInfo?.name || 'Unknown Creator',
            avatar: creatorInfo?.avatar || '/icons/colina.svg',
            username: creatorInfo?.username || '',
            role: creatorInfo?.role
          }
        });
      }
    }

    // Sort messages by timestamp (newest first)
    messages.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Limit to specified number of messages (default 4)
    const limitedMessages = messages.slice(0, limit);

    return NextResponse.json({ messages: limitedMessages }, { status: 200 });
    
  } catch (error: unknown) {
    console.error('Error fetching creator messages:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
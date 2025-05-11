import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

interface SendMessageRequest {
  conversationId: string;
  senderId: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendMessageRequest = await request.json();
    const { conversationId, senderId, content } = body;
    
    // Validate inputs
    if (!conversationId || !senderId || !content.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if conversation exists
    const conversationRef = db.collection('conversations').doc(conversationId);
    const conversationDoc = await conversationRef.get();
    
    if (!conversationDoc.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversationData = conversationDoc.data();
    const participants = conversationData?.participants || [];
    
    // Get other participants to mark message as unread for them
    const otherParticipants: string[] = participants.filter((id: string) => id !== senderId);
    
    // Create readStatus object with all recipients marked as unread
    const readStatus: Record<string, boolean> = {};
    otherParticipants.forEach(participantId => {
      readStatus[participantId] = false;
    });

    // Add message to the conversation's messages subcollection
    const messageRef = await conversationRef.collection('messages').add({
      sender: senderId,
      content: content,
      timestamp: FieldValue.serverTimestamp(),
      readStatus: readStatus, // Add read status for each recipient
    });

    // Update conversation with last message, timestamp, and unread counts
    const updateData: Record<string, string | number | FirebaseFirestore.FieldValue> = {
      lastMessage: content,
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    // Increment unread count for all other participants
    for (const participantId of otherParticipants) {
      updateData[`unreadCounts.${participantId}`] = FieldValue.increment(1);
    }
    
    await conversationRef.update(updateData);
    
    return NextResponse.json({
      success: true,
      messageId: messageRef.id,
    }, { status: 200 });
    
  } catch (error: unknown) {
    console.error('Error sending message:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the conversation ID from query parameters
    const conversationId = request.nextUrl.searchParams.get('conversationId');
    const userId = request.nextUrl.searchParams.get('userId'); // Add userId parameter
    
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }
  
    // Check if conversation exists
    const conversationRef = db.collection('conversations').doc(conversationId);
    const conversationDoc = await conversationRef.get();
    
    if (!conversationDoc.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
  
    // Get messages in the conversation
    const messagesRef = conversationRef.collection('messages');
    const snapshot = await messagesRef.orderBy('timestamp', 'asc').get();
    
    if (snapshot.empty) {
      return NextResponse.json({ messages: [] }, { status: 200 });
    }
    
    // Transform message documents to include only necessary data
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Convert Firebase timestamps to ISO strings for JSON serialization
      const timestamp = data.timestamp ? data.timestamp.toDate().toISOString() : null;
      
      // If userId is provided, include whether this message is read by this user
      let read = true; // Default to true if no readStatus
      if (userId && data.readStatus) {
        // If readStatus for this user exists and is false, mark as unread
        read = data.readStatus[userId] !== false;
      }
      
      return {
        id: doc.id,
        sender: data.sender || '',
        content: data.content || '',
        timestamp: timestamp,
        read: read, // Include read status
      };
    });
    
    return NextResponse.json({ messages }, { status: 200 });
    
  } catch (error: unknown) {
    console.error('Error fetching messages:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
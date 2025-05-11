import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, userId } = body;
    
    if (!conversationId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Update the conversation document to reset unread count for this user
    const conversationRef = db.collection('conversations').doc(conversationId);
    await conversationRef.update({
      [`unreadCounts.${userId}`]: 0
    });

    // 2. Update all messages in this conversation to mark them as read for this user
    const messagesRef = conversationRef.collection('messages');
    const unreadMessages = await messagesRef.where(`readStatus.${userId}`, '==', false).get();
    
    // Batch update all unread messages
    const batch = db.batch();
    unreadMessages.docs.forEach(doc => {
      batch.update(doc.ref, {
        [`readStatus.${userId}`]: true
      });
    });
    
    if (unreadMessages.size > 0) {
      await batch.commit();
    }
    
    return NextResponse.json({ 
      success: true,
      markedAsRead: unreadMessages.size
    }, { status: 200 });
    
  } catch (error: unknown) {
    console.error('Error marking messages as read:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
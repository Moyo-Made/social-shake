/* eslint-disable @typescript-eslint/no-explicit-any */
import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest } from 'next/server';

const db = getFirestore();

export async function POST(req: NextRequest) {
  try {
    const { currentUserId, creatorId, userData, creatorData } = await req.json();
    
    if (!currentUserId || !creatorId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if a conversation already exists between these users
    const existingConversation = await db.collection('conversations')
      .where('participants', 'array-contains', currentUserId)
      .get();
    
    let existingConvDoc: { id: string; [key: string]: any } | null = null;
    existingConversation.forEach(doc => {
      const data = doc.data();
      if (data.participants.includes(creatorId)) {
        existingConvDoc = { id: doc.id, ...data };
      }
    });

    if (existingConvDoc) {
      return new Response(
        JSON.stringify({ 
          conversationId: existingConvDoc,
          message: 'Existing conversation found' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create new conversation with unreadCounts
    const conversationData = {
      participants: [currentUserId, creatorId],
      participantsInfo: {
        [currentUserId]: {
          name: userData.name,
          avatar: userData.avatar,
          username: userData.username || '',
        },
        [creatorId]: {
          name: creatorData.name,
          avatar: creatorData.avatar,
          username: creatorData.username || '',
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessage: "Start a conversation",
      unreadCounts: {
        // Initialize unread counts to 0
        [currentUserId]: 0,
        [creatorId]: 0
      }
    };

    const conversationRef = await db.collection('conversations').add(conversationData);

    // Create welcome message to initialize the conversation
    const welcomeMessage = {
      sender: 'system',
      content: 'Conversation started',
      timestamp: new Date(),
      readStatus: {
        [currentUserId]: true,
        [creatorId]: true
      }
    };

    await conversationRef.collection('messages').add(welcomeMessage);

    return new Response(
      JSON.stringify({ 
        conversationId: conversationRef.id,
        message: 'Conversation created successfully' 
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error creating conversation:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create conversation' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
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
    
    let existingConvDoc: { id: string; participants: string[]; [key: string]: any } | null = null as { id: string; participants: string[]; [key: string]: any } | null;
    existingConversation.forEach(doc => {
      const data = doc.data();
      if (data.participants.includes(creatorId)) {
        existingConvDoc = { id: doc.id, participants: data.participants, ...data };
      }
    });

    if (existingConvDoc) {
      return new Response(
        JSON.stringify({ 
          conversationId: existingConvDoc.id,
          message: 'Existing conversation found' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get creator profile from database to ensure consistent avatar and display name
    let creatorProfile = null;
    try {
      // First try to query creatorProfiles by userId field
      const creatorProfilesQuery = await db.collection('creatorProfiles')
        .where('userId', '==', creatorId)
        .limit(1)
        .get();
      
      if (!creatorProfilesQuery.empty) {
        // Found profile by userId
        const profileData = creatorProfilesQuery.docs[0].data();
        creatorProfile = {
          avatarUrl: profileData?.tiktokAvatarUrl || creatorData.avatar,
          displayName: profileData?.tiktokDisplayName || creatorData.name
        };
      } else {
        // If not found by userId, try to get email from users collection
        const userDoc = await db.collection('users').doc(creatorId).get();
        if (userDoc.exists && userDoc.data()?.email) {
          const creatorEmail = userDoc.data()?.email;
          
          // Try to get profile by email
          const creatorDoc = await db.collection('creatorProfiles').doc(creatorEmail).get();
          if (creatorDoc.exists) {
            const profileData = creatorDoc.data();
            creatorProfile = {
              avatarUrl: profileData?.tiktokAvatarUrl || creatorData.avatar,
              displayName: profileData?.tiktokDisplayName || creatorData.name
            };
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching creator profile for ${creatorId}:`, error);
      // Use default creatorData if creatorProfile fetch fails
      creatorProfile = {
        avatarUrl: creatorData.avatar,
        displayName: creatorData.name
      };
    }

    // Use fetched profile or fallback to provided data
    const creatorAvatarUrl = creatorProfile?.avatarUrl || creatorData.avatar;
    const creatorDisplayName = creatorProfile?.displayName || creatorData.name;

    // Determine roles based on user IDs
    const determineRole = (userId: string) => {
      if (userId === creatorId) {
        return 'creator';
      }
      return 'user';
    };

    // Create new conversation with unreadCounts and roles
    const conversationData = {
      participants: [currentUserId, creatorId],
      participantsInfo: {
        [currentUserId]: {
          name: userData.name,
          avatar: userData.avatar,
          username: userData.username || '',
          role: determineRole(currentUserId),
        },
        [creatorId]: {
          name: creatorDisplayName,
          avatar: creatorAvatarUrl,
          username: creatorData.username || '',
          role: determineRole(creatorId),
          tiktokAvatarUrl: creatorProfile?.avatarUrl || creatorData.avatar,
          tiktokDisplayName: creatorProfile?.displayName || creatorData.name
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessage: "Start a conversation",
      unreadCounts: {
        [currentUserId]: 0,
        [creatorId]: 0
      },
      // Store creator profile data at the conversation level for easier retrieval
      creatorProfile: {
        avatarUrl: creatorProfile?.avatarUrl || creatorData.avatar,
        displayName: creatorProfile?.displayName || creatorData.name
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
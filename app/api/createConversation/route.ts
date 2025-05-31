import { getFirestore } from 'firebase-admin/firestore';
import { NextRequest } from 'next/server';

const db = getFirestore();

export async function POST(req: NextRequest) {
  try {
    const { 
      currentUserId, 
      creatorId, 
      brandId,
      userData, 
      creatorData,
      brandData
    } = await req.json();
    
    // Accept either creatorId or brandId
    const targetUserId = creatorId || brandId;
    const targetUserData = creatorData || brandData;
    const targetUserType = creatorId ? 'creator' : 'brand';
    
    if (!currentUserId || !targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // FIXED: More robust way to check for existing conversations
    // Create a deterministic conversation ID based on sorted user IDs
    const sortedParticipants = [currentUserId, targetUserId].sort();
    const conversationId = `${sortedParticipants[0]}_${sortedParticipants[1]}`;
    
    // Check if conversation with this exact ID already exists
    const existingConvRef = db.collection('conversations').doc(conversationId);
    const existingConvDoc = await existingConvRef.get();
    
    if (existingConvDoc.exists) {
      return new Response(
        JSON.stringify({ 
          conversationId: existingConvDoc.id,
          message: 'Existing conversation found' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Alternative approach: Query both directions to ensure we catch existing conversations
    const existingConversation1 = await db.collection('conversations')
      .where('participants', '==', [currentUserId, targetUserId])
      .limit(1)
      .get();
      
    const existingConversation2 = await db.collection('conversations')
      .where('participants', '==', [targetUserId, currentUserId])
      .limit(1)
      .get();

    if (!existingConversation1.empty) {
      const doc = existingConversation1.docs[0];
      return new Response(
        JSON.stringify({ 
          conversationId: doc.id,
          message: 'Existing conversation found' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!existingConversation2.empty) {
      const doc = existingConversation2.docs[0];
      return new Response(
        JSON.stringify({ 
          conversationId: doc.id,
          message: 'Existing conversation found' 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get profile from database based on user type
    let targetProfile = null;
    try {
      if (targetUserType === 'creator') {
        // Existing creator profile logic
        const creatorProfilesQuery = await db.collection('creatorProfiles')
          .where('userId', '==', targetUserId)
          .limit(1)
          .get();
        
        if (!creatorProfilesQuery.empty) {
          const profileData = creatorProfilesQuery.docs[0].data();
          targetProfile = {
            avatarUrl: profileData?.tiktokAvatarUrl || targetUserData.avatar,
            displayName: profileData?.tiktokDisplayName || targetUserData.name
          };
        } else {
          const userDoc = await db.collection('users').doc(targetUserId).get();
          if (userDoc.exists && userDoc.data()?.email) {
            const creatorEmail = userDoc.data()?.email;
            const creatorDoc = await db.collection('creatorProfiles').doc(creatorEmail).get();
            if (creatorDoc.exists) {
              const profileData = creatorDoc.data();
              targetProfile = {
                avatarUrl: profileData?.tiktokAvatarUrl || targetUserData.avatar,
                displayName: profileData?.tiktokDisplayName || targetUserData.name
              };
            }
          }
        }
      } else if (targetUserType === 'brand') {
        // For brands, use the provided brandData directly
        targetProfile = {
          avatarUrl: targetUserData.avatar,
          displayName: targetUserData.name
        };
      }
    } catch (error) {
      console.error(`Error fetching ${targetUserType} profile for ${targetUserId}:`, error);
      targetProfile = {
        avatarUrl: targetUserData.avatar,
        displayName: targetUserData.name
      };
    }

    // Use fetched profile or fallback to provided data
    const targetAvatarUrl = targetProfile?.avatarUrl || targetUserData.avatar;
    const targetDisplayName = targetProfile?.displayName || targetUserData.name;

    // Determine roles based on user type
    const determineRole = (userId: string) => {
      if (userId === targetUserId) {
        return targetUserType; // 'creator' or 'brand'
      }
      return 'user';
    };

    // Create new conversation with deterministic ID and sorted participants
    const conversationData = {
      participants: sortedParticipants, // Always store in sorted order
      participantsInfo: {
        [currentUserId]: {
          name: userData.name,
          avatar: userData.avatar,
          username: userData.username || '',
          role: determineRole(currentUserId),
        },
        [targetUserId]: {
          name: targetDisplayName,
          avatar: targetAvatarUrl,
          username: targetUserData.username || '',
          role: determineRole(targetUserId),
          ...(targetUserType === 'creator' && {
            tiktokAvatarUrl: targetProfile?.avatarUrl || targetUserData.avatar,
            tiktokDisplayName: targetProfile?.displayName || targetUserData.name
          })
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastMessage: "Start a conversation",
      unreadCounts: {
        [currentUserId]: 0,
        [targetUserId]: 0
      },
      // Store profile data at the conversation level for easier retrieval
      [`${targetUserType}Profile`]: {
        avatarUrl: targetProfile?.avatarUrl || targetUserData.avatar,
        displayName: targetProfile?.displayName || targetUserData.name
      }
    };

    // Use the deterministic conversation ID
    await existingConvRef.set(conversationData);

    // Create welcome message to initialize the conversation
    const welcomeMessage = {
      sender: 'system',
      content: 'Conversation started',
      timestamp: new Date(),
      readStatus: {
        [currentUserId]: true,
        [targetUserId]: true
      }
    };

    await existingConvRef.collection('messages').add(welcomeMessage);

    return new Response(
      JSON.stringify({ 
        conversationId: conversationId,
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
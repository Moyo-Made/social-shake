import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, event, data } = await request.json();
    
    if (!userId || !event || !data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use consistent socket server URL (matching your main API)
    const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3001';
    
    // Make request to your actual socket server with proper endpoint
    const response = await fetch(`${socketServerUrl}/api/broadcast-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room: `user_${userId}`,
        event,
        data
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Socket server error:', errorText);
      throw new Error(`Failed to broadcast to socket server: ${response.status}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to broadcast update', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
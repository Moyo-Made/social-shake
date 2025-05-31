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

    // Get your socket server URL
    const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:3000';
    
    // Make request to your actual socket server
    const response = await fetch(`${socketServerUrl}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room: `user_${userId}`,
        event,
        data
      })
    });

    if (!response.ok) {
      throw new Error('Failed to broadcast to socket server');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json(
      { error: 'Failed to broadcast update' },
      { status: 500 }
    );
  }
}
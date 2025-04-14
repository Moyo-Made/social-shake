import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/config/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Check for admin claim
    if (decodedToken.admin === true) {
      return NextResponse.json({ isAdmin: true }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Not an admin' }, { status: 403 });
    }
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}
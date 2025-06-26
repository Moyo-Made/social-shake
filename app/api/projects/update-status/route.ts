import { NextRequest, NextResponse } from 'next/server';
import {adminDb} from "../../../../config/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { projectId, status } = await request.json();
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Update project status in Firestore
    await adminDb.collection('projects').doc(projectId).update({
      status,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Project status updated'
    });

  } catch (error) {
    console.error('Error updating project status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
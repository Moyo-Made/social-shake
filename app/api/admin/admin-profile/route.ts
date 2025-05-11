import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/config/firebase-admin';
import { UserRole } from '@/types/user';

// This endpoint should only be accessible during initial setup or by existing admins
export async function POST(request: NextRequest) {
  try {
	// Parse the request body
	const body = await request.json();
	const { email, setupKey } = body;
	
	if (setupKey !== process.env.ADMIN_SETUP_KEY) {
	  return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 });
	}
	
	if (!email) {
	  return NextResponse.json({ error: 'Email is required' }, { status: 400 });
	}
	
	// Get or create user
	let user;
	try {
	  if (!adminAuth) {
		return NextResponse.json({ error: 'Authentication service is unavailable' }, { status: 500 });
	  }
	  user = await adminAuth.getUserByEmail(email);
	} catch {
	  // User doesn't exist, create them
	  return NextResponse.json({ 
		error: 'User must exist before being made an admin. Please register first.' 
	  }, { status: 400 });
	}
	
	// Set admin custom claim
	await adminAuth.setCustomUserClaims(user.uid, { admin: true });
	
	// Update or create user document
	if (!adminDb) {
	  return NextResponse.json({ error: 'Database service is unavailable' }, { status: 500 });
	}
	await adminDb.collection('users').doc(user.uid).set({
	  email: user.email,
	  role: UserRole.ADMIN,
	  createdAt: new Date(),
	  updatedAt: new Date()
	}, { merge: true });
	
	return NextResponse.json(
	  { success: true, message: `${email} is now an admin` }, 
	  { status: 200 }
	);
  } catch (error) {
	console.error('Admin setup error:', error);
	return NextResponse.json({ error: 'Failed to set up admin' }, { status: 500 });
  }
}

// This handles OPTIONS requests (for CORS if needed)
export async function OPTIONS() {
  return new NextResponse(null, {
	status: 204,
	headers: {
	  'Access-Control-Allow-Methods': 'POST',
	  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
	}
  });
}
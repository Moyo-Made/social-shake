import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

interface ContestData {
	contestId: string;
	[key: string]: unknown; // To allow additional fields from Firestore
}

interface ErrorResponse {
	success: false;
	message: string;
	error?: string;
}

interface SuccessResponse {
	success: true;
	data: ContestData;
}

type ApiResponse = ErrorResponse | SuccessResponse;

// In App Router, we use named exports for HTTP methods
export async function GET(
	request: NextRequest,
	{ params }: { params: { contestId: string } }
): Promise<NextResponse<ApiResponse | { message: string }>> {
	const { contestId } = params;

	if (!contestId) {
		return NextResponse.json(
			{ success: false, message: 'Contest ID is required' },
			{ status: 400 }
		);
	}

	try {
		// Get the contest document from Firestore
		const contestRef = doc(db, 'contests', contestId);
		const contestDoc = await getDoc(contestRef);

		if (!contestDoc.exists()) {
			return NextResponse.json(
				{
					success: false,
					message: 'Contest not found'
				},
				{ status: 404 }
			);
		}

		const contestData: ContestData = {
			contestId: contestDoc.id,
			...contestDoc.data()
		};

		return NextResponse.json(
			{
				success: true,
				data: contestData
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error fetching contest details:', error);
		return NextResponse.json(
			{ 
				success: false,
				message: 'Failed to fetch contest details',
				error: (error as Error).message 
			},
			{ status: 500 }
		);
	}
}
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

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

export default async function handler(
	req: { method: string; query: { contestId?: string } },
	res: {
		status: (code: number) => {
			json: (body: ApiResponse | { message: string }) => void;
		};
	}
): Promise<void> {
	if (req.method !== 'GET') {
		return res.status(405).json({ message: 'Method not allowed' });
	}

	const { contestId } = req.query;

	if (!contestId) {
		return res.status(400).json({ message: 'Contest ID is required' });
	}

	try {
		// Get the contest document from Firestore
		const contestRef = doc(db, 'contests', contestId);
		const contestDoc = await getDoc(contestRef);

		if (!contestDoc.exists()) {
			return res.status(404).json({
				success: false,
				message: 'Contest not found'
			});
		}

		const contestData: ContestData = {
			contestId: contestDoc.id,
			...contestDoc.data()
		};

		return res.status(200).json({
			success: true,
			data: contestData
		});
	} catch (error) {
		console.error('Error fetching contest details:', error);
		return res.status(500).json({ 
			success: false,
			message: 'Failed to fetch contest details',
			error: (error as Error).message 
		});
	}
}
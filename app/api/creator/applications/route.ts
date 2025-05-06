
import { db } from '@/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { NextApiRequest, NextApiResponse } from 'next';

interface Application {
	id: string;
	[key: string]: unknown; // To account for dynamic fields in the application data
}

interface ErrorResponse {
	success: false;
	message: string;
	error?: string;
}

interface SuccessResponse {
	success: true;
	data: Application[];
}

type ApiResponse = SuccessResponse | ErrorResponse;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
	if (req.method !== 'GET') {
		return res.status(405).json({ success: false, message: 'Method not allowed' });
	}

	const { userId } = req.query;

	if (!userId || typeof userId !== 'string') {
		return res.status(400).json({ success: false, message: 'User ID is required' });
	}

	try {
		// Query the contest_applications collection for entries matching the userId
		const applicationsRef = collection(db, 'contest_applications');
		const applicationsQuery = query(applicationsRef, where('userId', '==', userId));
		const applicationsSnapshot = await getDocs(applicationsQuery);

		// Convert the query snapshot to an array of application objects
		const applications: Application[] = [];
		applicationsSnapshot.forEach((doc) => {
			applications.push({
				id: doc.id,
				...doc.data()
			});
		});

		return res.status(200).json({
			success: true,
			data: applications
		});
	} catch (error: unknown) {
		console.error('Error fetching creator applications:', error);

		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return res.status(500).json({ 
			success: false,
			message: 'Failed to fetch applications',
			error: errorMessage
		});
	}
}
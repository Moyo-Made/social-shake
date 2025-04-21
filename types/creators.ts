export interface Creator {
	id: string;
	verificationId: string;
	userId: string;
	creator: string;
	status: string; 
	createdAt: string;
	logoUrl: string | null;
	bio: string;
	socialMedia: {
		instagram?: string;
		twitter?: string;
		facebook?: string;
		youtube?: string;
		tiktok?: string;
		[key: string]: string | undefined;
	};
	firstName: string;
	lastName: string;
	email: string;
	username: string;
	contentTypes: string[];
	contentLinks: string[];
	country: string;
	gender: string;
	ethnicity: string | null;
	dateOfBirth: string;
	verifiableIDUrl: string | null;
	verificationVideoUrl: string | null;
}
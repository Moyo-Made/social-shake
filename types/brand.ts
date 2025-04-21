import { BrandStatus } from "./user";

export interface Brand {
	id: string;
	email: string;
	userId: string;
	brandName: string;
	logoUrl?: string;
	status: BrandStatus;
	createdAt: string;
	updatedAt: string;
	industry?: string;
	phoneNumber?: string;
	address?: string;
	website?: string;
	socialMedia?: {
		facebook?: string;
		twitter?: string;
		instagram?: string;
		youtube?: string;
	};
}

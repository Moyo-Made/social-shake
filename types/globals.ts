
export {
	
}
declare global {
	let broadcastVerificationUpdate: ((update: {
	  userId: string;
	  status: string;
	  rejectionReason?: string;
	  infoRequest?: string;
	  suspensionReason?: string;
	}) => void) | undefined;
  }
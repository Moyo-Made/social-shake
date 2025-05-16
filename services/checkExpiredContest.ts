import { adminDb } from "@/config/firebase-admin";

// In a separate Cloud Functions file:
import * as functions from "firebase-functions/v1";

exports.checkExpiredContests = functions.pubsub.schedule('every 24 hours').onRun(async () => {
	const now = new Date().toISOString();
	const expiredContests = await adminDb
	  .collection('contests')
	  .where('status', '==', 'active')
	  .where('prizeTimeline.endDate', '<=', now)
	  .get();
	
	const batch = adminDb.batch();
	expiredContests.forEach(doc => {
	  batch.update(doc.ref, {
		status: 'completed',
		applicationStatus: 'closed'
	  });
	});
	
	if (expiredContests.size > 0) {
	  await batch.commit();
	  console.log(`Updated ${expiredContests.size} expired contests to completed status`);
	}
	
	return null;
  });
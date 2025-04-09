import { db } from "@/config/firebase";
import {
	collection,
	addDoc,
	query,
	where,
	orderBy,
	getDocs,
	doc,
	updateDoc,
	deleteDoc,
	Timestamp,
} from "firebase/firestore";
import { Notification } from "./type";

export async function createNotification({
	userId,
	title,
	message,
	type,
	relatedId,
	link,
}: Omit<Notification, "id" | "read" | "createdAt">) {
	try {
		const notificationRef = await addDoc(collection(db, "notifications"), {
			userId,
			title,
			message,
			type,
			relatedId,
			link,
			read: false,
			createdAt: Timestamp.now(),
		});

		return notificationRef.id;
	} catch (error) {
		console.error("Error creating notification:", error);
		throw error;
	}
}

export async function getUserNotifications(userId: string) {
	try {
		const q = query(
			collection(db, "notifications"),
			where("userId", "==", userId),
			orderBy("createdAt", "desc")
		);

		const querySnapshot = await getDocs(q);

		return querySnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
			createdAt: doc.data().createdAt.toDate(),
		})) as Notification[];
	} catch (error) {
		console.error("Error fetching notifications:", error);
		throw error;
	}
}

export async function markNotificationAsRead(notificationId: string) {
	try {
		const notificationRef = doc(db, "notifications", notificationId);
		await updateDoc(notificationRef, {
			read: true,
		});
	} catch (error) {
		console.error("Error marking notification as read:", error);
		throw error;
	}
}

export async function deleteNotification(notificationId: string) {
	try {
		const notificationRef = doc(db, "notifications", notificationId);
		await deleteDoc(notificationRef);
	} catch (error) {
		console.error("Error deleting notification:", error);
		throw error;
	}
}

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { BellIcon, XIcon } from "lucide-react";

export default function NotificationBell() {
	const router = useRouter();
	const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
		useNotifications();
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	interface Notification {
		id?: string;
		link?: string;
		title: string;
		message: string;
		createdAt: Date | string | number;
		read: boolean;
	}

	const handleNotificationClick = async (notification: Notification) => {
		if (notification.id) {
			await markAsRead(notification.id);
		}
		if (notification.link) {
			router.push(notification.link);
		}
		setIsOpen(false);
	};

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none"
				onClick={() => setIsOpen(!isOpen)}
			>
				<BellIcon className="w-6 h-6" />
				{unreadCount > 0 && (
					<span className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
						{unreadCount > 9 ? "9+" : unreadCount}
					</span>
				)}
			</button>

			{isOpen && (
				<div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
					<div className="p-3 border-b flex items-center justify-between">
						<h3 className="font-medium">Notifications</h3>
						{unreadCount > 0 && (
							<button
								onClick={markAllAsRead}
								className="text-xs text-orange-500 hover:text-orange-600"
							>
								Mark all as read
							</button>
						)}
					</div>

					{loading ? (
						<div className="p-6 text-center text-gray-500">Loading...</div>
					) : notifications.length === 0 ? (
						<div className="p-6 text-center text-gray-500">
							No notifications
						</div>
					) : (
						<div>
							{notifications.map((notification) => (
								<div
									key={notification.id}
									className={`p-3 hover:bg-gray-50 border-b relative ${
										!notification.read ? "bg-orange-50" : ""
									}`}
								>
									<div
										onClick={() => handleNotificationClick(notification)}
										className="cursor-pointer pr-8"
									>
										<h4 className="font-medium text-sm">
											{notification.title}
										</h4>
										<p className="text-sm text-gray-600 mt-1">
											{notification.message}
										</p>
										<p className="text-xs text-gray-400 mt-1">
											{formatDistanceToNow(notification.createdAt, {
												addSuffix: true,
											})}
										</p>
									</div>
									<button
										onClick={(e) => {
											e.stopPropagation();
										}}
										className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
									>
										<XIcon className="w-4 h-4" />
									</button>
								</div>
							))}
						</div>
					)}

					<div className="p-3 border-t text-center">
						<button
							onClick={() => {
								router.push("/notifications");
								setIsOpen(false);
							}}
							className="text-sm text-orange-500 hover:text-orange-600"
						>
							View all notifications
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

// Helper component for action buttons
	interface ActionButtonProps {
		text: string;
		icon: "arrow-right" | "mail" | "x" | "bookmark";
		primary?: boolean;
		secondary?: boolean;
		danger?: boolean;
		fullWidth?: boolean;
		onClick?: () => void;
	}

	const  ActionButton =({
		text,
		icon,
		primary = false,
		secondary = false,
		danger = false,
		fullWidth = false,
		onClick,
	}: ActionButtonProps)  => {
		let buttonClasses =
			"flex items-center justify-center py-2 px-4 rounded font-normal rounded-md";

		if (primary) {
			buttonClasses += " bg-orange-500 hover:bg-orange-600 text-white";
		} else if (secondary) {
			buttonClasses += " bg-gray-900 hover:bg-black text-white";
		} else if (danger) {
			buttonClasses += " bg-[#E61A1A] hover:bg-red-600 text-white";
		}

		if (fullWidth) {
			buttonClasses += " w-full";
		} else {
			buttonClasses += " flex-1";
		}

		return (
			<button className={buttonClasses} onClick={onClick}>
				{text}
				{icon === "arrow-right" && (
					<svg
						className="ml-2 w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M14 5l7 7m0 0l-7 7m7-7H3"
						/>
					</svg>
				)}
				{icon === "mail" && (
					<svg
						className="ml-2 w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
						/>
					</svg>
				)}
				{icon === "x" && (
					<svg
						className="ml-2 w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				)}
				{icon === "bookmark" && (
					<svg
						className="ml-2 w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
						/>
					</svg>
				)}
			</button>
		);
	}

	export default ActionButton;
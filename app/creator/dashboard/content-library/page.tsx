"use client";

import ContentLibraryPage from "@/components/Creators/dashboard/content-library/ContentLibrary";
import { useAuth } from "@/context/AuthContext";
import React from "react";

export default function ContentLibrary() {
	const { currentUser } = useAuth();

	return (
		<div>
			<ContentLibraryPage userId={currentUser?.uid || ""} />
		</div>
	);
};


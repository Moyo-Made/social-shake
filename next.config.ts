import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	reactStrictMode: true,
	images: {
		domains: [
			"storage.googleapis.com",
			"firebasestorage.googleapis.com",
			"lh3.googleusercontent.com", // if using Google auth
			"p16-sign-va.tiktokcdn.com",
		],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "storage.googleapis.com",
				pathname: "/**",
			},
		],
	},
	env: {
		FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
	},
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	reactStrictMode: true,
	images: {
		domains: ["storage.googleapis.com"],
	},
	env: {
		FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY
	  }
};

export default nextConfig;

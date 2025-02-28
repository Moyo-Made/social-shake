// import React, { useEffect, useState } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import ApplicationDetail from "@/components/dashboard/ViewContests/ApplicationDetail";

// // Define the application type
// interface Application {
// 	id: number;
// 	username: string;
// 	handle: string;
// 	date: string;
// 	status: "Pending" | "Approved" | "Rejected";
// 	whySelected: string;
// 	avatarSrc: string;
// 	hasMarketplace: boolean;
// }

// // Sample application data with detailed content
// const applicationData: Record<number, Application> = {
// 	1: {
// 		id: 1,
// 		username: "Colina Demirdjian",
// 		handle: "@colinedzfr",
// 		date: "March 14, 2025",
// 		status: "Pending",
// 		avatarSrc: "https://i.pravatar.cc/150?img=1",
// 		hasMarketplace: true,
// 		whySelected: `Hi Social Shake,

// I'm thrilled about the opportunity to participate in your contest! As a content creator with 10,000 Followers and an engagement rate of 60%, I've honed my skills in crafting TikTok videos that are not only visually appealing but also resonate with audiences and drive engagement.

// I understand that your campaign focuses on young adults who love trending shoes, and I'm confident in my ability to deliver content that aligns with your vision and stands out. Whether it's incorporating creative transitions, storytelling, or unique movement styles, I'll ensure the video captures attention while adhering to your guidelines.

// I've worked on similar projects before, and I'm always eager to experiment and push creative boundaries. Let's collaborate to create something impactful that showcases the best of your brand!`,
// 	},
// 	2: {
// 		id: 2,
// 		username: "Olumide Webb",
// 		handle: "@olumawebb",
// 		date: "March 22, 2025",
// 		status: "Approved",
// 		avatarSrc: "https://i.pravatar.cc/150?img=2",
// 		hasMarketplace: true,
// 		whySelected: `Hi Social Shake,

// As a sneaker enthusiast and fashion content creator, I believe I'm the perfect fit for your campaign. My audience of 15,000 followers is primarily in the 18-24 age range and highly engaged with footwear content.

// My videos feature a unique blend of streetwear fashion and urban culture that resonates well with your target demographic. I've previously collaborated with three shoe brands, creating content that achieved above-average engagement rates.

// I'm excited about the creative direction of your campaign and have several ideas for how to showcase your products in an authentic way that will connect with potential customers.`,
// 	},
// 	3: {
// 		id: 3,
// 		username: "Tripalmez94",
// 		handle: "@tripalmezKek",
// 		date: "March 24, 2025",
// 		status: "Rejected",
// 		avatarSrc: "https://i.pravatar.cc/150?img=3",
// 		hasMarketplace: false,
// 		whySelected: `Hello Social Shake,

// I would love to be part of your contest as I believe my content style would be a perfect match. I create lifestyle and fashion videos with a focus on authentic storytelling.

// With 8,500 followers who are primarily interested in fashion trends, I can create content that will showcase your products in real-world situations that resonate with your audience.

// My strength is in creating relatable content that feels genuine rather than promotional, which helps drive higher engagement and conversion rates.`,
// 	},
// };

// const ApplicationDetailPage = () => {
// 	const router = useRouter();
// 	const searchParams = useSearchParams();
// 	const id = searchParams.get('id');
// 	const [application, setApplication] = useState<Application | null>(null);

// 	useEffect(() => {
// 		// Get application data when ID is available
// 		if (id) {
// 			const appId = parseInt(id as string);
// 			// Get application from sample data
// 			const foundApplication = applicationData[appId];

// 			if (foundApplication) {
// 				setApplication(foundApplication);
// 			}
// 		}
// 	}, [id]);

// 	if (!application) {
// 		return <div className="p-8 text-center">Loading application...</div>;
// 	}

// 	return <ApplicationDetail application={application} />;
// };

// export default ApplicationDetailPage;

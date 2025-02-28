// import React from "react";
// import { Button } from "@/components/ui/button";
// import { ChevronLeft, Mail } from "lucide-react";
// import Link from "next/link";

// interface ApplicationDetailProps {
//   application: {
//     id: number;
//     username: string;
//     handle: string;
//     date: string;
//     status: "Pending" | "Approved" | "Rejected";
//     whySelected?: string;
//     avatarSrc: string;
//     hasMarketplace?: boolean;
//   };
// }

// const ApplicationDetail: React.FC<ApplicationDetailProps> = ({ application }) => {
//   const { id, username, handle, date, status, whySelected, hasMarketplace } = application;

//   // Sample application text if not provided
//   const applicationText = whySelected || `Hi Social Shake,

// I'm thrilled about the opportunity to participate in your contest! As a content creator with 10,000 Followers and an engagement rate of 60%, I've honed my skills in crafting TikTok videos that are not only visually appealing but also resonate with audiences and drive engagement.

// I understand that your campaign focuses on young adults who love trending shoes, and I'm confident in my ability to deliver content that aligns with your vision and stands out. Whether it's incorporating creative transitions, storytelling, or unique movement styles, I'll ensure the video captures attention while adhering to your guidelines.

// I've worked on similar projects before, and I'm always eager to experiment and push creative boundaries. Let's collaborate to create something impactful that showcases the best of your brand!`;

//   return (
//     <div className="flex flex-col md:flex-row gap-6 max-w-6xl mx-auto p-4">
//       {/* Left panel - Application details */}
//       <div className="flex-1 bg-white rounded-lg border shadow-sm p-6">
//         <Link href="/applications" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
//           <ChevronLeft className="h-4 w-4 mr-1" />
//           <span>Go Back</span>
//         </Link>

//         <h1 className="text-xl font-bold mb-6">Contest Application Submission - #{id}</h1>

//         <div className="space-y-4">
//           <div>
//             <p className="text-sm text-gray-500">Creator Full Name</p>
//             <p className="font-medium">{username}</p>
//           </div>

//           <div>
//             <p className="text-sm text-gray-500">Creator Tiktok Profile:</p>
//             <p className="font-medium text-orange-500">{handle}</p>
//           </div>

//           <div>
//             <p className="text-sm text-gray-500">Do you have Tiktok Creator Marketplace Account:</p>
//             <p className="font-medium">{hasMarketplace ? "Yes" : "No"}</p>
//           </div>

//           <div>
//             <p className="text-sm text-gray-500">Why should you be selected?</p>
//             <div className="mt-1">
//               {applicationText.split("\n\n").map((paragraph, idx) => (
//                 <p key={idx} className="mb-3">
//                   {paragraph}
//                 </p>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Right panel - Status and actions */}
//       <div className="w-full md:w-72">
//         <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
//           <div>
//             <p className="text-sm text-gray-500">Application Date</p>
//             <p className="font-medium">{date}</p>
//           </div>

//           <div>
//             <p className="text-sm text-gray-500">Status</p>
//             <StatusBadge status={status} />
//           </div>

//           <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white">
//             <Mail className="mr-2 h-4 w-4" />
//             Message Creator
//           </Button>

//           {status === "Pending" && (
//             <>
//               <Button className="w-full bg-black hover:bg-gray-800 text-white">
//                 Approve Application
//               </Button>
//               <Button variant="outline" className="w-full text-red-500 hover:bg-red-50">
//                 Reject Application
//               </Button>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
//   const getStatusStyles = () => {
//     switch (status) {
//       case "Pending":
//         return "bg-yellow-100 text-yellow-800 border border-yellow-200";
//       case "Approved":
//         return "bg-green-100 text-green-800 border border-green-200";
//       case "Rejected":
//         return "bg-red-100 text-red-800 border border-red-200";
//       default:
//         return "bg-gray-100 text-gray-800 border border-gray-200";
//     }
//   };

//   // Get status indicator
//   const renderStatusIndicator = () => {
//     if (status === "Approved") {
//       return <Check size={12} className="mr-1 text-green-600" />;
//     } else if (status === "Pending") {
//       return <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1" />;
//     } else if (status === "Rejected") {
//       return <div className="w-2 h-2 bg-red-400 rounded-full mr-1" />;
//     }
//     return null;
//   };

//   return (
//     <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusStyles()}`}>
//       {renderStatusIndicator()}
//       <span>{status}</span>
//     </div>
//   );
// };

// // Add the missing import for the Check icon
// import { Check } from "lucide-react";

// export default ApplicationDetail;
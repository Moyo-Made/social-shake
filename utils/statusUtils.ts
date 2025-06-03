import { ProjectStatus } from "@/types/projects";

export const getStatusStyle = (status: ProjectStatus) => {
  const normalizedStatus = status.toLowerCase();
  
  switch (normalizedStatus) {
    case "pending":
      return {
        color: "bg-yellow-100 text-[#1A1A1A] border border-[#FDD849]",
        text: "• Pending"
      };
    case "active":
      return {
        color: "bg-yellow-100 text-[#1A1A1A] border border-[#FDD849]",
        text: "✓ Accepting Pitches"
      };
      case "invite":
      return {
        color: "bg-[#FFF3CD] text-[#856404] border border-[#FFBF47]",
        text: "• Invited Creators"
      };
    case "rejected":
      return {
        color: "bg-red-100 text-[#F04438] border border-red-200",
        text: "• Rejected"
      };
    case "completed":
      return {
        color: "bg-[#ECFDF3] text-[#067647] border border-[#ABEFC6]",
        text: "✓ Completed"
      };
    case "request_edit":
      return {
        color: "bg-[#FFF3CD] border border-[#FFBF47] text-[#856404]",
        text: "• Request Edit"
      };
    case "draft":
      return {
        color: "bg-[#F6F6F6] text-[#667085] border border-[#D0D5DD]",
        text: "• Draft"
      };
    default:
      return {
        color: "bg-[#F6F6F6] text-[#667085] border border-[#D0D5DD]",
        text: "• Draft"
      };
  }
};

// Function to determine status dot color
// export const getStatusDot = (status: ProjectStatus) => {
//   const normalizedStatus = status.toLowerCase();

//   switch (normalizedStatus) {
//     case "active":
//       return "bg-[#1A1A1A]";
//     case "pending":
//       return "bg-[#1A1A1A]";
//     case "completed":
//       return "bg-[#067647]";
//     case "rejected":
//       return "bg-[#F04438]";
//     case "request_edit":
//       return "bg-[#FDD849]";
//     case "draft":
//       return "bg-[#667085]";
//     default:
//       return "bg-[#667085]";
//   }

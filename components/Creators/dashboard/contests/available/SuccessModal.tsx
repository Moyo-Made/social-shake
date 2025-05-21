"use client";

import { useRouter } from "next/navigation";

interface SuccessModalProps {
  isOpen: boolean;
  contestId: string;
  onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, contestId }) => {
  const router = useRouter();
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-xl shadow-lg p-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-1 mb-1">
            <span role="img" aria-label="celebration" className="text-3xl">🎉</span>
          <h2 className="text-2xl font-bold ">You&apos;re In!</h2>
          </div>
          
          
          <p className="text-gray-600 mb-3">
            The leaderboard updates every hour, so stay tuned to track your progress.
          </p>
          
          <p className="text-gray-600 mb-6">
            You&apos;ve also been added to the contest&apos;s message channel, where you&apos;ll
            receive the latest updates and can communicate directly with the brand
            about the contest.
          </p>
          
          <button
            onClick={() => {
              router.push(`/creator/dashboard/contest/${contestId}/leaderboard`);
              onClose();
            }}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            View Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
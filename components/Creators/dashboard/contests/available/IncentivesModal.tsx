import React, { useState } from "react";
import { Incentive } from "@/components/brand/brandProfile/dashboard/newContest/ContestFormContext";

// Define interface for component props
interface IncentivesModalProps {
  isOpen: boolean;
  onClose: () => void;
  incentives: Incentive[];
}

const IncentivesModal: React.FC<IncentivesModalProps> = ({ isOpen, onClose, incentives }) => {
  const [activeIncentiveIndex, setActiveIncentiveIndex] = useState<number>(0);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <span className="text-2xl">&times;</span>
        </button>
        
        <div className="p-6">
          <h2 className="text-xl font-bold mb-6 text-center">Exclusive Rewards & Incentives</h2>
          
          <div className="flex">
            {/* Left sidebar with incentive tabs */}
            <div className="w-1/3 border-r pr-4">
              {incentives.map((incentive, index) => (
                <div 
                  key={index}
                  onClick={() => setActiveIncentiveIndex(index)}
                  className={`py-3 px-2 cursor-pointer ${
                    activeIncentiveIndex === index 
                      ? "text-[#FD5C02] border-b-2 border-[#FD5C02]" 
                      : "text-gray-600"
                  }`}
                >
                  Incentive #{index + 1}
                </div>
              ))}
            </div>
            
            {/* Right side with incentive details */}
            <div className="w-2/3 pl-6">
              {incentives[activeIncentiveIndex] && (
                <div className="grid grid-cols-2 gap-4 mb-6">
				
                  <div className="mb-4">
                    <div className="text-gray-600">Incentive Name</div>
                    <div className="font-medium text-base">{incentives[activeIncentiveIndex].name}</div>
                  </div>
                  
                  <div className=" mb-4">
                    <div className="text-gray-600">Incentive Worth:</div>
                    <div className="font-medium text-base">${incentives[activeIncentiveIndex].worth}</div>
                  </div>
                  
                  <div className="md:col-span-2 mb-4">
                    <div className="text-gray-600">Incentive Description</div>
                    <div className="whitespace-pre-wrap">
                      {incentives[activeIncentiveIndex].description}
                      {/* If you need to format with bullet points */}
                      {incentives[activeIncentiveIndex].name.includes("Package") && (
                        <ul className="list-disc mt-2 pl-5 space-y-2">
                          <li>A Sony ZV-1 Camera for high-quality video content</li>
                          <li>A Rode Wireless GO II Microphone for crisp audio</li>
                          <li>A 3-month Adobe Creative Cloud Subscription to edit your content like a pro</li>
                          <li>A $500 Ad Spend Credit to boost your winning post</li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncentivesModal;
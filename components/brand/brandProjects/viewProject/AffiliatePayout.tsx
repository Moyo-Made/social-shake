import { Card } from "@/components/ui/card";
import Image from "next/image";
import React, { useState } from "react";

const affiliatePayoutData = {
  pendingPayouts: 4,
  totalPendingAmount: "$1,680",
  totalProcessed: "$3,100",
};

const affiliatePayoutTableData = [
  {
    id: 1,
    username: "Colina42rf",
    requestDate: "2025-03-10",
    profileImage: "/icons/colina.svg",
    amount: "$4,200",
    status: "Processing",
  },
  {
    id: 2,
    username: "Madev7",
    requestDate: "2025-03-10",
    profileImage: "/icons/colina.svg",
    amount: "$4,200",
    status: "Processing",
  },
  {
    id: 3,
    username: "Colina42rf",
    requestDate: "2025-03-10",
    profileImage: "/icons/colina.svg",
    amount: "$4,200",
    status: "Processing",
  },
  {
    id: 4,
    username: "Colina42rf",
    requestDate: "2025-03-10",
    profileImage: "/icons/colina.svg",
    amount: "$4,200",
    status: "Processing",
  },
  {
    id: 5,
    username: "Colina42rf",
    requestDate: "2025-03-10",
    profileImage: "/icons/colina.svg",
    amount: "$4,200",
    status: "Processing",
  },
];

const AffiliatePayout = () => {
  const [payoutData, setPayoutData] = useState(affiliatePayoutTableData);
  const [selectedCreators, setSelectedCreators] = useState<number[]>([]);
  
  // Calculate total amount from selected creators
  const calculateTotal = () => {
    return selectedCreators.reduce((total, id) => {
      const creator = payoutData.find(item => item.id === id);
      if (creator) {
        // Remove $ and convert to number
        const amount = parseFloat(creator.amount.replace('$', '').replace(',', ''));
        return total + amount;
      }
      return total;
    }, 0);
  };
  
  // Handle checkbox selection
  const handleSelect = (id: number) => {
    if (selectedCreators.includes(id)) {
      setSelectedCreators(selectedCreators.filter(creatorId => creatorId !== id));
    } else {
      setSelectedCreators([...selectedCreators, id]);
    }
  };
  
  // Process selected payments
  const processSelectedPayments = () => {
    const updatedData = payoutData.map(item => {
      if (selectedCreators.includes(item.id)) {
        return { ...item, status: "Processed" };
      }
      return item;
    });
    
    setPayoutData(updatedData);
    setSelectedCreators([]);
  };

  return (
    <div className="w-full max-w-7xl -mt-10 p-6 bg-white rounded-lg shadow-sm">
      {/* Affiliate Payout Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        <Card className="py-4 px-5 flex flex-col items-start justify-start border border-gray-100">
          <Image
            src="/icons/pending-payout.svg"
            alt="Total Contestants"
            width={40}
            height={40}
          />
          <p className="text-xs text-[#475467] mb-1 mt-2">Pending Payouts</p>
          <h2 className="text-2xl text-[#101828] font-semibold">
            {affiliatePayoutData.pendingPayouts.toLocaleString()}
          </h2>
        </Card>

        <Card className="py-4 px-5 flex flex-col items-start justify-start border border-gray-100">
          <Image
            src="/icons/pending-payment.svg"
            alt="Total Views"
            width={40}
            height={40}
          />
          <p className="text-xs text-[#475467] mb-1 mt-2">
            Total Pending Amount
          </p>
          <h2 className="text-2xl text-[#101828] font-semibold">
            {affiliatePayoutData.totalPendingAmount}
          </h2>
        </Card>

        <Card className="py-4 px-5 flex flex-col items-start justify-start border border-gray-100">
          <Image
            src="/icons/processed.svg"
            alt="Total Likes"
            width={40}
            height={40}
          />
          <p className="text-xs text-[#475467] mb-1 mt-2">Total Processed</p>
          <h2 className="text-2xl text-[#101828] font-semibold">
            {affiliatePayoutData.totalProcessed}
          </h2>
        </Card>
      </div>

      {/* Leaderboard Table */}
      <div className="flex bg-gray-50 border rounded-t-lg py-3 text-[#475467] text-sm font-normal border-b border-gray-200">
        <div className="flex-1 text-center"></div>
        <div className="flex-1 mr-5 text-center">Creator Username</div>
        <div className="flex-1 text-center">Request Date</div>
        <div className="flex-1 text-center">Amount</div>
        <div className="flex-1 text-center">Status</div>
        <div className="flex-1 text-center">Actions</div>
      </div>
      
      {/* Table Rows */}
      {payoutData.map((item) => (
        <div
          key={item.id}
          className="flex py-3 items-center border border-gray-200 text-sm text-[#101828]"
        >
          <div className="flex-1 flex justify-center items-center">
            <div 
              className={`w-5 h-5 border ${selectedCreators.includes(item.id) ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-300'} rounded cursor-pointer flex items-center justify-center`}
              onClick={() => handleSelect(item.id)}
            >
              {selectedCreators.includes(item.id) && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12L10 17L19 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <div className="flex-1 mr-5 flex justify-start items-center gap-2">
            <Image
              src={item.profileImage}
              alt={item.username}
              className="w-8 h-8 rounded-full"
              width={8}
              height={8}
            />
            <span className="underline font-medium">{item.username}</span>
          </div>
          <div className="flex-1 text-center">{item.requestDate}</div>
          <div className="flex-1 text-center">{item.amount}</div>
          <div className="flex-1 text-center">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              item.status === "Processing" ? "bg-[#FFF0C3] text-[#1A1A1A] border border-[#FDD849]" : "bg-[#ECFDF3] text-[#067647] border border-[#ABEFC6]"
            }`}>
              <span className="mr-1.5 w-1.5 h-1.5 rounded-full bg-current"></span>
              {item.status}
            </div>
          </div>
          <div className="flex-1 text-center">
            <button className="text-orange-500 hover:underline">
              Process Payment
            </button>
          </div>
        </div>
      ))}
      
      {/* Selected Summary Bar */}
      {selectedCreators.length > 0 && (
        <div className="mt-4 bg-white border-t border-gray-200 p-4 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[#667085] text-sm">Selected: {selectedCreators.length} creators</span>
            <span className="text-base text-[#101828] font-bold">Total: ${calculateTotal()}</span>
          </div>
          <div className="flex gap-3">
            <button 
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
              onClick={() => setSelectedCreators([])}
            >
              Cancel
            </button>
            <button 
              className="px-3 py-3 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
              onClick={processSelectedPayments}
            >
              Process Selected Payments
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AffiliatePayout;
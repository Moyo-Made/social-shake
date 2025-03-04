"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Basic from "./Basic";
import Requirements from "./Requirements";
import PrizeTimeline from "./PrizeTimeline";
import Review from "./Review";
import { MdOutlinePayment } from "react-icons/md";
import { useRouter } from "next/navigation";
import { ContestFormProvider, useContestForm } from "./ContestFormContext";
import { CheckCircle2 } from "lucide-react";
import GMVPrizeTimeline from "./GMVPrizeTimeline";
import GMVReview from "./GMVReview";

const ContestFormContent = () => {
    const [step, setStep] = useState(1);
    const router = useRouter();
    const { saveDraft, draftSaved, formData } = useContestForm();

    const { 
        prizeTimeline, 
        basic: { contestType = "leaderboard" } 
    } = formData;

    const handleSubmit = () => {
        router.push("/payment-successful");
    };

    // Dynamic component rendering based on contest type and step
    const renderStepComponent = () => {
        if (contestType === "leaderboard") {
            switch (step) {
                case 1: return <Basic />;
                case 2: return <Requirements />;
                case 3: return <PrizeTimeline />;
                case 4: return <Review />;
            }
        } else {
            switch (step) {
                case 1: return <Basic />;
                case 2: return <Requirements />;
                case 3: return <GMVPrizeTimeline />;
                case 4: return <GMVReview />;
            }
        }
    };

    return (
        <div className="max-w-[44rem] mx-auto">
            {/* Navigation Tabs */}
            <nav className="flex pb-6">
                {["Basics", "Requirements", "Incentives & Timeline", "Review"].map(
                    (tab, index) => (
                        <div key={index} className="flex-1 whitespace-nowrap relative">
                            <button
                                className={`w-full p-3 text-center ${
                                    step === index + 1 ? "text-orange-500" : "text-gray-500"
                                }`}
                                onClick={() => setStep(index + 1)}
                            >
                                <div className="flex items-center justify-center gap-1">
                                    <Image
                                        src={
                                            step === index + 1
                                                ? "/icons/orange-check.svg"
                                                : "/icons/gray-check.svg"
                                        }
                                        alt="Check"
                                        width={25}
                                        height={25}
                                    />
                                    <span className="text-base">{tab}</span>
                                </div>
                            </button>
                            {step === index + 1 && (
                                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#FD5C02] rounded-full"></div>
                            )}
                        </div>
                    )
                )}
            </nav>

            {/* Step Content */}
            <div className="">
                <div className="">
                    {renderStepComponent()}
                </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
                {/* Save Draft Button */}
                <div className="relative">
                    <Button
                        onClick={saveDraft}
                        className="mt-4 bg-gray-500 hover:bg-gray-600 px-4 py-2 text-white text-base"
                    >
                        Save Draft
                    </Button>

                    {draftSaved && (
                        <div className="absolute -top-8 left-0 px-3 py-1 bg-green-100 border border-green-300 rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-600">
                                Draft saved successfully!
                            </span>
                        </div>
                    )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-2">
                    {step > 1 && (
                        <Button
                            onClick={() => setStep(step - 1)}
                            className="mt-4 bg-[#FC52E4] hover:bg-[#e061cf] px-4 py-2 text-white text-base"
                        >
                            ← Back
                        </Button>
                    )}

                    {step < 4 ? (
                        <Button
                            onClick={() => setStep(step + 1)}
                            className="mt-4 bg-[#FD5C02] hover:bg-orange-600 text-white text-base py-2 font-normal"
                        >
                            Next →
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            className="mt-4 bg-[#000] hover:bg-[#141414] text-white text-base py-2 font-normal"
                        >
                            <MdOutlinePayment size={30} /> Pay $
                            {prizeTimeline.totalBudget.toLocaleString()}
                        </Button>
                    )}
                </div>
            </div>
        </div>                                                                                             
    );
};

export default function ContestForm() {
    return (
        <ContestFormProvider>
            <ContestFormContent />
        </ContestFormProvider>
    );
}
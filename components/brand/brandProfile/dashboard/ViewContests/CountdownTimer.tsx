import React, { useState, useEffect } from "react";

interface Contest {
  prizeTimeline: {
    startDate: string;
    endDate: string;
  };
}

const CountdownTimer: React.FC<{ contest: Contest }> = ({ contest }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  const [isExpired, setIsExpired] = useState(false);
  const [countingToStart, setCountingToStart] = useState(false);

  useEffect(() => {
    if (!contest?.prizeTimeline) return;
    
    // Get the start and end dates from contest data
    const startDate = new Date(contest.prizeTimeline.startDate);
    const endDate = new Date(contest.prizeTimeline.endDate);
    const now = new Date();
    
    // Determine which date to count down to
    let targetDate;
    if (now < startDate) {
      // Count down to contest start
      targetDate = startDate;
      setCountingToStart(true);
    } else if (now < endDate) {
      // Count down to contest end
      targetDate = endDate;
      setCountingToStart(false);
    } else {
      // Contest has ended
      setIsExpired(true);
      return;
    }

    // Calculate the time difference between now and target date
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setIsExpired(true);
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        };
      }
      
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    // Set initial countdown
    setTimeLeft(calculateTimeLeft());
    
    // Update countdown every second
    const timer = setInterval(() => {
      const updatedTimeLeft = calculateTimeLeft();
      setTimeLeft(updatedTimeLeft);
      
      // Check if countdown has expired
      if (updatedTimeLeft.days === 0 && 
          updatedTimeLeft.hours === 0 && 
          updatedTimeLeft.minutes === 0 && 
          updatedTimeLeft.seconds === 0) {
        setIsExpired(true);
        clearInterval(timer);
      }
    }, 1000);

    // Cleanup timer
    return () => clearInterval(timer);
  }, [contest]);

  // Format numbers to always show two digits
  const formatNumber = (num: number) => {
    return num.toString().padStart(2, '0');
  };

  return (
    <div className="flex flex-col items-center my-8">
      <h2 className="text-2xl font-bold mb-4">
        {isExpired ? "Contest Ended" : 
         countingToStart ? "Contest Starts In" : 
         "Contest Ends In"}
      </h2>
      
      <div className="flex space-x-4">
        <div className="flex flex-col items-center">
          <div className="bg-gray-100 text-gray-800 rounded-lg w-16 h-16 flex items-center justify-center text-2xl font-bold">
            {formatNumber(timeLeft.days)}
          </div>
          <span className="text-sm mt-1">Days</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="bg-gray-100 text-gray-800 rounded-lg w-16 h-16 flex items-center justify-center text-2xl font-bold">
            {formatNumber(timeLeft.hours)}
          </div>
          <span className="text-sm mt-1">Hours</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="bg-gray-100 text-gray-800 rounded-lg w-16 h-16 flex items-center justify-center text-2xl font-bold">
            {formatNumber(timeLeft.minutes)}
          </div>
          <span className="text-sm mt-1">Minutes</span>
        </div>
        
        <div className="flex flex-col items-center">
          <div className="bg-gray-100 text-gray-800 rounded-lg w-16 h-16 flex items-center justify-center text-2xl font-bold">
            {formatNumber(timeLeft.seconds)}
          </div>
          <span className="text-sm mt-1">Seconds</span>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
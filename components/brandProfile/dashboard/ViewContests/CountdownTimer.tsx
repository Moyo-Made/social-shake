import Image from 'next/image';
import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate }) => {
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isComplete: false
  });

  useEffect(() => {
    // Function to calculate the time difference
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;
      
      // If the countdown is complete
      if (difference <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isComplete: true
        });
        return;
      }
      
      // Calculate remaining time
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        isComplete: false
      });
    };

    // Initial calculation
    calculateTimeRemaining();
    
    // Update the countdown every second
    const intervalId = setInterval(calculateTimeRemaining, 1000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [targetDate]);

  const { days, hours, minutes, seconds, isComplete } = timeRemaining;

  // Format numbers to always show two digits (e.g., 05 instead of 5)
  const formatNumber = (num: number) => {
    return num < 10 ? `0${num}` : num;
  };

  return (
    <div className="flex flex-col items-center text-center mb-3">
      <h2 className="text-gray-600 text-xl mb-1 font-medium">Time Remaining</h2>
      
      {!isComplete ? (
        <div className="flex items-center justify-center text-3xl sm:text-4xl md:text-5xl font-bold">
          <div className="flex flex-col items-center">
            <span className="text-black">{days}</span>
            <span className="text-gray-500 text-sm sm:text-base mt-1">Days</span>
          </div>
          <span className="mx-2 text-black -mt-10">:</span>
          <div className="flex flex-col items-center">
            <span className="text-black">{formatNumber(hours)}</span>
            <span className="text-gray-500 text-sm sm:text-base mt-1">Hours</span>
          </div>
          <span className="mx-2 text-black -mt-10">:</span>
          <div className="flex flex-col items-center">
            <span className="text-black">{formatNumber(minutes)}</span>
            <span className="text-gray-500 text-sm sm:text-base mt-1">Minutes</span>
          </div>
          <span className="mx-2 text-black -mt-10">:</span>
          <div className="flex flex-col items-center">
            <span className="text-black">{formatNumber(seconds)}</span>
            <span className="text-gray-500 text-sm sm:text-base mt-1">Seconds</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-3xl font-bold">
			<Image src="/icons/confetti.png" alt="Confetti" width={35} height={35} />
          <span>Contest Concluded</span>
        </div>
      )}
    </div>
  );
};

export default CountdownTimer;
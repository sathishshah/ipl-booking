'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string;
  onComplete: () => void;
}

// Calculate the time difference in days, hours, minutes, seconds
const calculateTimeLeft = (targetDate: string): { 
  days: number; 
  hours: number; 
  minutes: number; 
  seconds: number; 
  isComplete: boolean;
} => {
  const difference = new Date(targetDate).getTime() - new Date().getTime();
  const isComplete = difference <= 0;
  
  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    isComplete
  };
};

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate));
  
  useEffect(() => {
    // If already complete, call the onComplete callback
    if (timeLeft.isComplete) {
      onComplete();
      return;
    }
    
    // Update the countdown every second
    const timer = setTimeout(() => {
      const newTimeLeft = calculateTimeLeft(targetDate);
      setTimeLeft(newTimeLeft);
      
      // Call onComplete when timer reaches zero
      if (newTimeLeft.isComplete && !timeLeft.isComplete) {
        onComplete();
      }
    }, 1000);
    
    // Clear the timeout when component unmounts
    return () => clearTimeout(timer);
  }, [targetDate, timeLeft, onComplete]);
  
  // If countdown is complete, show a message
  if (timeLeft.isComplete) {
    return <div className="text-green-600 font-semibold">Booking Open!</div>;
  }
  
  // Format each time component to have leading zeros if needed
  const formatTimeComponent = (value: number): string => {
    return value.toString().padStart(2, '0');
  };
  
  return (
    <div className="flex space-x-2 items-center">
      <div className="text-sm font-medium">Booking opens in:</div>
      <div className="flex items-center">
        {timeLeft.days > 0 && (
          <span className="mr-1">{timeLeft.days}d:</span>
        )}
        <span>{formatTimeComponent(timeLeft.hours)}h:</span>
        <span>{formatTimeComponent(timeLeft.minutes)}m:</span>
        <span>{formatTimeComponent(timeLeft.seconds)}s</span>
      </div>
    </div>
  );
};

export default CountdownTimer; 
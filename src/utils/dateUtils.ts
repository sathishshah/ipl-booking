import { format, isToday, isTomorrow } from 'date-fns';

// Format date in a human-readable way
export const formatMatchDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// Format time in 12-hour format
export const formatMatchTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Get a T20 match index (e.g., "T20 40 of 74")
export function getMatchIndex(index: number, total: number = 74): string {
  return `T20 ${index} of ${total}`;
}

export const formatCountdown = (targetDate: string): string => {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = target.getTime() - now.getTime();
  
  // If the date has passed
  if (diff < 0) return "Booking Closed";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h to go`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m to go`;
  } else {
    return `${minutes}m to go`;
  }
}; 
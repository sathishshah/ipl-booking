'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const MatchList = dynamic(() => import('@/components/MatchList'), {
  loading: () => <p className="text-center p-8">Loading matches...</p>
});

export default function Home() {
  // Using client-side only rendering with useEffect
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">IPL Ticket Booking System</h1>
        {isClient && <MatchList />}
      </div>
    </div>
  );
}

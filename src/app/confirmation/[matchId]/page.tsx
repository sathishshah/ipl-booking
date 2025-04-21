'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { getUserId } from '@/lib/queueService';

export default function ConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;
  
  const [matchDetails, setMatchDetails] = useState<{
    name: string;
    venue: string;
    date: string;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchConfirmationData = async () => {
      try {
        // Get the user ID
        const userId = getUserId();
        
        // If server-side or no userId, exit
        if (!userId || userId === 'server-side') {
          setError('User session not found. Please try again.');
          setLoading(false);
          return;
        }
        
        // Check if user has completed booking
        const { data: queueData, error: queueError } = await supabase
          .from('queue')
          .select('status')
          .eq('match_id', matchId)
          .eq('user_id', userId)
          .single();
        
        if (queueError || !queueData) {
          setError('No booking found.');
          setLoading(false);
          return;
        }
        
        // Verify booking status
        if (queueData.status !== 'completed') {
          if (queueData.status === 'waiting') {
            router.push(`/waiting/${matchId}`);
            return;
          } else if (queueData.status === 'processing') {
            router.push(`/booking/${matchId}`);
            return;
          } else {
            setError('Your booking session has expired.');
            setLoading(false);
            return;
          }
        }
        
        // Fetch match details
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('match_name, venue, match_datetime')
          .eq('id', matchId)
          .single();
        
        if (matchError) throw matchError;
        
        setMatchDetails({
          name: matchData.match_name,
          venue: matchData.venue,
          date: new Date(matchData.match_datetime).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching confirmation data:', error);
        setError('Error loading confirmation data. Please check your bookings.');
        setLoading(false);
      }
    };
    
    fetchConfirmationData();
  }, [matchId, router]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Loading confirmation...</h1>
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-500 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded"
          >
            Return to Matches
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-block p-3 rounded-full bg-green-100 mb-4">
            <svg 
              className="w-12 h-12 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600">Your tickets have been successfully booked.</p>
        </div>
        
        {matchDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-bold text-lg mb-2">{matchDetails.name}</h2>
            <p className="text-gray-700 mb-1">
              <span className="font-medium">Date: </span>
              {matchDetails.date}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Venue: </span>
              {matchDetails.venue}
            </p>
          </div>
        )}
        
        <div className="border-t border-gray-200 pt-6 mb-6">
          <p className="text-center text-gray-700 mb-1">
            Please check your email for your e-tickets.
          </p>
          <p className="text-center text-gray-500 text-sm">
            (Note: This is a demo, no actual tickets will be delivered)
          </p>
        </div>
        
        <div className="flex justify-center">
          <button 
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded"
          >
            Return to Matches
          </button>
        </div>
      </div>
    </div>
  );
} 
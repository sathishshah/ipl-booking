'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { getUserId, getQueuePosition, checkMyTurn } from '@/lib/queueService';

export default function WaitingPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;
  
  const [matchDetails, setMatchDetails] = useState<{ name: string; venue: string; date: string } | null>(null);
  const [peopleAhead, setPeopleAhead] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Get the user ID
        const userId = getUserId();
        
        // If server-side or no userId, exit
        if (!userId || userId === 'server-side') {
          setError('User session not found. Please try again.');
          setLoading(false);
          return;
        }
        
        // Fetch the match details
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
        
        // Get user's queue entry
        const { data: queueData, error: queueError } = await supabase
          .from('queue')
          .select('id, joined_at, status')
          .eq('match_id', matchId)
          .eq('user_id', userId)
          .single();
        
        if (queueError) {
          // If user is not in queue, redirect to matches page
          router.push('/');
          return;
        }
        
        // Check if user has an expired or completed session
        if (queueData.status === 'expired') {
          setError('Your queue session has expired. Please join the queue again.');
          setLoading(false);
          return;
        }
        
        if (queueData.status === 'completed') {
          // Redirect to ticket selection
          router.push(`/tickets/${matchId}`);
          return;
        }
        
        // Check if user is already processing (might be returning to this page)
        if (queueData.status === 'processing') {
          router.push(`/booking/${matchId}`);
          return;
        }
        
        // Get initial queue position
        const initialPeopleAhead = await getQueuePosition(matchId, userId);
        setPeopleAhead(initialPeopleAhead);
        
        setLoading(false);
        
        // Check if it's this user's turn immediately
        if (initialPeopleAhead === 0) {
          const isMyTurn = await checkMyTurn(matchId, userId);
          if (isMyTurn) {
            router.push(`/booking/${matchId}`);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error fetching data. Please try again.');
        setLoading(false);
      }
    };
    
    fetchInitialData();
    
    // Set up two intervals:
    // 1. One for updating the queue position (10 seconds)
    // 2. One for checking if it's the user's turn (5 seconds)
    
    const updatePositionInterval = setInterval(async () => {
      const userId = getUserId();
      if (userId && userId !== 'server-side') {
        // Check if user's status has changed
        const { data: queueData } = await supabase
          .from('queue')
          .select('status')
          .eq('match_id', matchId)
          .eq('user_id', userId)
          .single();
        
        if (queueData) {
          if (queueData.status === 'completed') {
            clearInterval(updatePositionInterval);
            router.push(`/tickets/${matchId}`);
            return;
          } else if (queueData.status === 'expired') {
            clearInterval(updatePositionInterval);
            setError('Your queue session has expired. Please join the queue again.');
            return;
          } else if (queueData.status === 'processing') {
            clearInterval(updatePositionInterval);
            router.push(`/booking/${matchId}`);
            return;
          }
        }
        
        // Update queue position
        const newPeopleAhead = await getQueuePosition(matchId, userId);
        setPeopleAhead(newPeopleAhead);
      }
    }, 10000); // 10 seconds interval
    
    const checkTurnInterval = setInterval(async () => {
      const userId = getUserId();
      if (userId && userId !== 'server-side') {
        // Only check if it might be our turn (0 people ahead or close)
        const ahead = await getQueuePosition(matchId, userId);
        if (ahead !== null && ahead <= 1) { // Check if we're at the front or very close
          const isMyTurn = await checkMyTurn(matchId, userId);
          if (isMyTurn) {
            clearInterval(updatePositionInterval);
            clearInterval(checkTurnInterval);
            router.push(`/booking/${matchId}`);
          }
        }
      }
    }, 5000); // 5 seconds interval
    
    return () => {
      clearInterval(updatePositionInterval);
      clearInterval(checkTurnInterval);
    };
  }, [matchId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Loading queue information...</h1>
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
  
  // Generate a random number between min and max (inclusive) for demo purposes
  const getRandomInt = (min: number, max: number) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };
  
  // For demo purposes, if we don't have a real count, use a random number
  const displayPeopleAhead = peopleAhead ?? getRandomInt(5000, 50000);
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-4">You are waiting in line...</h1>
          {matchDetails && (
            <>
              <p className="text-lg font-semibold text-blue-700">{matchDetails.name}</p>
              <p className="text-gray-600">{matchDetails.date} at {matchDetails.venue}</p>
            </>
          )}
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <svg 
                className="w-10 h-10 text-blue-600 mr-3" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              <span className="text-3xl font-bold text-blue-800">{displayPeopleAhead.toLocaleString()}</span>
            </div>
            <p className="text-blue-700 font-medium text-lg">people in front of you</p>
          </div>
        </div>
        
        <div className="text-center mb-6 border-t border-b border-gray-200 py-4">
          <p className="text-gray-700 font-medium mb-2">You&apos;ll be auto-redirected to the booking page once it&apos;s your turn</p>
          <p className="text-gray-600">Complete your purchase within 10 minutes once redirected</p>
        </div>
        
        <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
          <div className="bg-blue-600 h-full animate-pulse" style={{ width: '40%' }}></div>
        </div>
        
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Please do not refresh this page or press back</p>
        </div>
      </div>
    </div>
  );
} 
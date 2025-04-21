'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { getUserId } from '@/lib/queueService';

export default function QueuePage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;
  
  const [matchDetails, setMatchDetails] = useState<{ name: string; venue: string } | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [peopleAhead, setPeopleAhead] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQueueData = async () => {
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
          .select('match_name, venue')
          .eq('id', matchId)
          .single();
        
        if (matchError) throw matchError;
        
        setMatchDetails({
          name: matchData.match_name,
          venue: matchData.venue
        });
        
        // Get user's queue entry
        const { data: queueData, error: queueError } = await supabase
          .from('queue')
          .select('id, joined_at, status')
          .eq('match_id', matchId)
          .eq('user_id', userId)
          .single();
        
        if (queueError) throw queueError;
        
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
        
        // Count how many people are ahead in the queue (joined earlier and still waiting/processing)
        const { count, error: countError } = await supabase
          .from('queue')
          .select('*', { count: 'exact', head: true })
          .eq('match_id', matchId)
          .eq('status', 'waiting')
          .lt('joined_at', queueData.joined_at);
        
        if (countError) throw countError;
        
        setQueuePosition(queueData.id);
        setPeopleAhead(count);
        
        // Start polling for queue status updates
        const interval = setInterval(async () => {
          const { data: updatedQueue, error: pollError } = await supabase
            .from('queue')
            .select('status')
            .eq('id', queueData.id)
            .single();
          
          if (pollError) {
            console.error('Error polling queue status:', pollError);
            return;
          }
          
          if (updatedQueue.status === 'completed') {
            clearInterval(interval);
            router.push(`/tickets/${matchId}`);
          } else if (updatedQueue.status === 'expired') {
            clearInterval(interval);
            setError('Your queue session has expired. Please join the queue again.');
          }
          
          // Update the people ahead count
          const { count: newCount } = await supabase
            .from('queue')
            .select('*', { count: 'exact', head: true })
            .eq('match_id', matchId)
            .eq('status', 'waiting')
            .lt('joined_at', queueData.joined_at);
          
          setPeopleAhead(newCount);
        }, 5000); // Poll every 5 seconds
        
        return () => clearInterval(interval);
      } catch (error) {
        console.error('Error fetching queue data:', error);
        setError('Error fetching queue data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchQueueData();
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
  
  // Generate a random number between min and max (inclusive)
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
          <h1 className="text-2xl font-bold mb-2">You're in the Queue!</h1>
          {matchDetails && (
            <p className="text-gray-600">{matchDetails.name} at {matchDetails.venue}</p>
          )}
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="text-center">
            <p className="text-sm text-blue-600 font-medium mb-2">Your position</p>
            <div className="flex items-center justify-center mb-4">
              <svg 
                className="w-6 h-6 text-blue-600 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              <span className="text-2xl font-bold text-blue-800">{displayPeopleAhead.toLocaleString()}</span>
            </div>
            <p className="text-blue-700">people in front of you</p>
          </div>
        </div>
        
        <div className="text-center mb-6">
          <p className="text-gray-600 mb-2">Please do not refresh or close this page</p>
          <p className="text-gray-600">You'll be automatically redirected when it's your turn</p>
        </div>
        
        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
          <div className="bg-blue-600 h-full animate-pulse" style={{ width: '40%' }}></div>
        </div>
      </div>
    </div>
  );
} 
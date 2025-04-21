'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { getUserId, getQueuePosition, checkMyTurn } from '@/lib/queueService';
import { getTeamCode, getTeamLogoUrl, getTeamNames } from '@/utils/teamUtils';

export default function WaitingPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;
  
  const [loading, setLoading] = useState(true);
  const [matchDetails, setMatchDetails] = useState<{ name: string; datetime: string } | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [team1Logo, setTeam1Logo] = useState<string>('');
  const [team2Logo, setTeam2Logo] = useState<string>('');
  const [team1Code, setTeam1Code] = useState<string>('');
  const [team2Code, setTeam2Code] = useState<string>('');
  
  useEffect(() => {
    const checkForYourTurn = async () => {
      try {
        const userId = getUserId();
        
        if (!userId || userId === 'server-side') {
          setError('Session expired. Please try again.');
          return;
        }
        
        // Check if user is still in queue and what their status is
        const { data: queueData, error: queueError } = await supabase
          .from('queue')
          .select('status')
          .eq('match_id', matchId)
          .eq('user_id', userId)
          .single();
        
        if (queueError || !queueData) {
          setError('You are not in the queue for this match.');
          return;
        }
        
        // If the user's status has changed to 'processing', redirect to booking page
        if (queueData.status === 'processing') {
          router.push(`/booking/${matchId}`);
          return;
        }
        
        // If user is no longer in 'waiting' status and not in 'processing'
        if (queueData.status !== 'waiting') {
          // If expired, show error and redirect to home
          if (queueData.status === 'expired') {
            setError('Your queue position has expired.');
            setTimeout(() => router.push('/'), 3000);
            return;
          }
          
          setError(`Unexpected queue status: ${queueData.status}`);
          return;
        }
        
        // If still waiting, update position
        const position = await getQueuePosition(userId, matchId);
        setQueuePosition(position);
        
        // Simple estimation: 2 minutes per person ahead in queue
        if (position !== null) {
          setEstimatedWaitTime(position * 2);
          
          // If position is 0, check if it's our turn
          if (position === 0) {
            const isMyTurn = await checkMyTurn(matchId, userId);
            if (isMyTurn) {
              router.push(`/booking/${matchId}`);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error checking turn:', error);
        setError('Failed to check your turn. Please try again.');
      }
    };

    const fetchMatchDetails = async () => {
      try {
        setLoading(true);
        
        // Check if user is authorized to see this page
        const userId = getUserId();
        
        if (!userId || userId === 'server-side') {
          setError('Session expired. Please try again.');
          setLoading(false);
          return;
        }
        
        // Get match details
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select('match_name, match_datetime')
          .eq('id', matchId)
          .single();
        
        if (matchError) {
          throw matchError;
        }
        
        // Extract team names and codes
        const { team1, team2 } = getTeamNames(matchData.match_name);
        const team1C = getTeamCode(team1);
        const team2C = getTeamCode(team2);
        
        setTeam1Logo(getTeamLogoUrl(team1C));
        setTeam2Logo(getTeamLogoUrl(team2C));
        setTeam1Code(team1C);
        setTeam2Code(team2C);
        
        setMatchDetails({
          name: matchData.match_name,
          datetime: new Date(matchData.match_datetime).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        });
        
        // Initialize countdown for page refresh
        setCountdown(10);
        
        // Initial check for position
        await checkForYourTurn();
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching match details:', error);
        setError('Error fetching match details. Please try again.');
        setLoading(false);
      }
    };
    
    fetchMatchDetails();
    
    // Set up interval to check queue position every 10 seconds
    const positionInterval = setInterval(checkForYourTurn, 10000);
    
    // Set up interval to update countdown every second
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Trigger a position check when countdown reaches zero
          checkForYourTurn();
          // Reset countdown
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      clearInterval(positionInterval);
      clearInterval(countdownInterval);
    };
  }, [matchId, router]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin inline-block w-12 h-12 border-[3px] border-current border-t-transparent text-blue-600 rounded-full mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading Queue Status</h1>
            <p className="text-gray-500">Checking your position in line...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <div className="text-center">
            <div className="inline-block p-4 rounded-full bg-red-100 text-red-500 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Error</h1>
            <p className="text-red-500 mb-6">{error}</p>
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
  
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto max-w-lg px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
            <h1 className="text-2xl font-bold mb-2">You're in Line!</h1>
            
            {matchDetails && (
              <p className="text-white/80 text-sm">{matchDetails.name}</p>
            )}
          </div>
          
          {/* Display team logos */}
          {team1Logo && team2Logo && (
            <div className="py-6 px-8 border-b border-gray-100">
              <div className="flex items-center justify-center space-x-4">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center p-1 border border-gray-100 mb-2 overflow-hidden shadow-md">
                    <img 
                      src={team1Logo} 
                      alt={team1Code}
                      className="w-16 h-16 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/logos/IPL.svg";
                      }}
                    />
                  </div>
                  <span className="font-bold text-sm">{team1Code}</span>
                </div>
                
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shadow-md">
                  VS
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center p-1 border border-gray-100 mb-2 overflow-hidden shadow-md">
                    <img 
                      src={team2Logo} 
                      alt={team2Code}
                      className="w-16 h-16 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/logos/IPL.svg";
                      }}
                    />
                  </div>
                  <span className="font-bold text-sm">{team2Code}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="p-6">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-800">Your Position in Queue</h2>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  Updates in {countdown}s
                </div>
              </div>
              
              {queuePosition !== null ? (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                  <div className="text-5xl font-bold text-blue-700 mb-2">{queuePosition}</div>
                  <p className="text-blue-600">
                    {queuePosition === 0 ? (
                      "You're next! Preparing your booking page..."
                    ) : (
                      `${queuePosition} ${queuePosition === 1 ? 'person' : 'people'} ahead of you`
                    )}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-gray-500">Calculating your position...</p>
                </div>
              )}
            </div>
            
            {estimatedWaitTime !== null && queuePosition !== 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Estimated Wait Time</h2>
                <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-700 mb-1">
                    ~{estimatedWaitTime} {estimatedWaitTime === 1 ? 'minute' : 'minutes'}
                  </div>
                  <p className="text-green-600 text-sm">
                    This is just an estimate and may vary
                  </p>
                </div>
              </div>
            )}
            
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-medium text-yellow-800 mb-1">Important Information</h3>
                  <p className="text-yellow-700 text-sm">
                    Please stay on this page. When it's your turn, we'll automatically 
                    redirect you to the booking page. You'll have 10 minutes to complete your booking.
                  </p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => router.push('/')}
              className="w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Return to Matches
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
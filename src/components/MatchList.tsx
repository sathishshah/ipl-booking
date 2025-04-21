'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { Match } from '@/types/database.types';
import { format } from 'date-fns';
import CountdownTimer from './CountdownTimer';
import { joinQueue } from '@/lib/queueService';
import { getTeamCode, getTeamLogoUrl, getTeamNames } from '@/utils/teamUtils';
import { formatMatchDate, formatMatchTime } from '@/utils/dateUtils';

const MatchList = () => {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<Record<string, boolean>>({});
  const [joiningQueue, setJoiningQueue] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const { data, error } = await supabase
          .from('matches')
          .select('*')
          .order('match_datetime', { ascending: true });

        if (error) {
          throw error;
        }

        setMatches(data || []);
        
        // Initialize booking status for each match
        const initialBookingStatus: Record<string, boolean> = {};
        data?.forEach(match => {
          initialBookingStatus[match.id] = new Date() >= new Date(match.booking_opens_at);
        });
        setBookingStatus(initialBookingStatus);
      } catch (error) {
        console.error('Error fetching matches:', error);
        setError('Failed to load matches. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  const handleTimerComplete = (matchId: string) => {
    setBookingStatus(prev => ({
      ...prev,
      [matchId]: true
    }));
  };

  const handleJoinQueue = async (matchId: string) => {
    // Set loading state for this match
    setJoiningQueue(prev => ({
      ...prev,
      [matchId]: true
    }));

    try {
      const result = await joinQueue(matchId);
      
      if (result.success && result.queueId) {
        // Redirect to waiting page with the match ID
        router.push(`/waiting/${matchId}`);
      } else {
        // Convert unknown error to string for Error constructor
        const message = typeof result.error === 'string'
          ? result.error
          : result.error instanceof Error
            ? result.error.message
            : 'Failed to join queue';
        throw new Error(message);
      }
    } catch (error) {
      console.error('Error joining queue:', error);
      alert('Failed to join queue. Please try again later.');
    } finally {
      setJoiningQueue(prev => ({
        ...prev,
        [matchId]: false
      }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">TATA IPL 2025 Matches</h1>
      
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-center">
          {error}
        </div>
      )}
      
      {!loading && matches.length === 0 && !error && (
        <div className="text-center py-20">
          <p className="text-gray-600 text-lg">No matches available at the moment.</p>
        </div>
      )}
      
      {!loading && matches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match, index) => {
            const { team1, team2 } = getTeamNames(match.match_name);
            const team1Code = getTeamCode(team1);
            const team2Code = getTeamCode(team2);
            const isBookingOpen = bookingStatus[match.id];
            
            return (
              <div 
                key={match.id} 
                className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 transition-transform hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-semibold uppercase tracking-wider">Match #{index + 1}</h2>
                    <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded-full">{formatMatchDate(match.match_datetime)}</span>
                  </div>
                </div>
                
                <div className="p-5">
                  <div className="flex items-center justify-between my-4">
                    <div className="flex flex-col items-center w-2/5">
                      <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center p-1 border border-gray-100 mb-2 overflow-hidden shadow-md">
                        <img 
                          src={getTeamLogoUrl(team1Code)} 
                          alt={team1}
                          className="w-20 h-20 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/logos/IPL.svg";
                          }}
                        />
                      </div>
                      <span className="font-bold text-center">{team1Code}</span>
                      <span className="text-xs text-gray-500 text-center truncate max-w-full px-2">{team1}</span>
                    </div>
                    
                    <div className="w-1/5 flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold shadow-md">
                        VS
                      </div>
                      <span className="text-xs text-gray-500 mt-2 font-semibold">
                        {formatMatchTime(match.match_datetime)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-center w-2/5">
                      <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center p-1 border border-gray-100 mb-2 overflow-hidden shadow-md">
                        <img 
                          src={getTeamLogoUrl(team2Code)} 
                          alt={team2}
                          className="w-20 h-20 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/logos/IPL.svg";
                          }}
                        />
                      </div>
                      <span className="font-bold text-center">{team2Code}</span>
                      <span className="text-xs text-gray-500 text-center truncate max-w-full px-2">{team2}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center text-gray-600 text-sm bg-gray-50 p-2 rounded-md">
                      <svg className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                      <span className="truncate font-medium">{match.venue}</span>
                    </div>
                    
                    {!isBookingOpen && (
                      <div className="flex items-center bg-orange-50 p-2 rounded-md">
                        <svg className="w-4 h-4 mr-2 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span className="text-sm text-orange-700 font-medium">Booking opens in:</span>
                      </div>
                    )}
                  </div>
                  
                  {!isBookingOpen ? (
                    <div className="mt-3 mb-4">
                      <CountdownTimer 
                        targetDate={match.booking_opens_at} 
                        onComplete={() => handleTimerComplete(match.id)}
                      />
                    </div>
                  ) : (
                    <div className="mt-5">
                      <button
                        onClick={() => handleJoinQueue(match.id)}
                        disabled={joiningQueue[match.id]}
                        className={`w-full py-3 px-4 rounded-lg text-center font-medium transition-colors ${
                          joiningQueue[match.id]
                            ? 'bg-gray-300 text-gray-500'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white hover:from-blue-700 hover:to-indigo-800 shadow-md hover:shadow-lg'
                        }`}
                      >
                        {joiningQueue[match.id] ? 'Joining Queue...' : 'Book Tickets'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MatchList; 
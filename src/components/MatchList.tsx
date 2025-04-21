'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { Match } from '@/types/database.types';
import { format } from 'date-fns';
import CountdownTimer from './CountdownTimer';
import { joinQueue } from '@/lib/queueService';

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
        throw new Error(result.error || 'Failed to join queue');
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

  if (loading) {
    return <div className="flex justify-center p-8">Loading matches...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">IPL Matches</h1>
      
      {matches.length === 0 ? (
        <p>No matches available at the moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => (
            <div 
              key={match.id} 
              className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
            >
              <div className="bg-blue-600 text-white p-4">
                <h2 className="text-xl font-semibold">{match.match_name}</h2>
              </div>
              <div className="p-4">
                <p className="mb-2">
                  <span className="font-medium">Date & Time: </span>
                  {format(new Date(match.match_datetime), 'PPP p')}
                </p>
                <p className="mb-2">
                  <span className="font-medium">Venue: </span>
                  {match.venue}
                </p>
                <p className="mb-4">
                  <span className="font-medium">Booking: </span>
                  {bookingStatus[match.id] ? (
                    <span className="text-green-600 font-semibold">Now Open!</span>
                  ) : (
                    <CountdownTimer 
                      targetDate={match.booking_opens_at} 
                      onComplete={() => handleTimerComplete(match.id)}
                    />
                  )}
                </p>
                
                <button 
                  className={`w-full font-medium py-2 px-4 rounded transition-colors ${
                    bookingStatus[match.id] 
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
                  disabled={!bookingStatus[match.id] || joiningQueue[match.id]}
                  onClick={() => handleJoinQueue(match.id)}
                >
                  {joiningQueue[match.id] 
                    ? 'Joining Queue...' 
                    : bookingStatus[match.id] 
                      ? 'Join Queue' 
                      : 'Booking opens soon'
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MatchList; 
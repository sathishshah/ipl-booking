'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { getUserId, confirmBooking } from '@/lib/queueService';
import { Stand } from '@/types/database.types';

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;
  
  const [matchDetails, setMatchDetails] = useState<{ name: string; venue: string; date: string } | null>(null);
  const [stands, setStands] = useState<Stand[]>([]);
  const [selectedStand, setSelectedStand] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes in seconds
  
  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        // Get the user ID
        const userId = getUserId();
        
        // If server-side or no userId, exit
        if (!userId || userId === 'server-side') {
          setError('User session not found. Please try again.');
          setLoading(false);
          return;
        }
        
        // Check if user is in 'processing' status
        const { data: queueData, error: queueError } = await supabase
          .from('queue')
          .select('status')
          .eq('match_id', matchId)
          .eq('user_id', userId)
          .single();
        
        if (queueError || !queueData) {
          setError('You are not authorized to view this page.');
          setLoading(false);
          return;
        }
        
        // Verify the user is in the correct status
        if (queueData.status !== 'processing') {
          if (queueData.status === 'waiting') {
            router.push(`/waiting/${matchId}`);
            return;
          } else if (queueData.status === 'completed') {
            router.push(`/tickets/${matchId}`);
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
        
        // Fetch available stands
        const { data: standsData, error: standsError } = await supabase
          .from('stands')
          .select('*')
          .eq('match_id', matchId);
        
        if (standsError) throw standsError;
        
        setStands(standsData || []);
        
        // If we have stands, set the first one as selected by default
        if (standsData && standsData.length > 0) {
          setSelectedStand(standsData[0].id);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching booking data:', error);
        setError('Error fetching booking data. Please try again.');
        setLoading(false);
      }
    };
    
    fetchBookingData();
    
    // Set up the booking timer
    const timerInterval = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerInterval);
          // Mark the session as expired
          const userId = getUserId();
          if (userId && userId !== 'server-side') {
            supabase
              .from('queue')
              .update({ status: 'expired' })
              .eq('match_id', matchId)
              .eq('user_id', userId)
              .then(() => {
                setError('Your booking session has expired due to inactivity.');
                setTimeout(() => {
                  router.push('/');
                }, 3000);
              });
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    return () => {
      clearInterval(timerInterval);
    };
  }, [matchId, router]);
  
  const handleConfirmBooking = async () => {
    try {
      if (!selectedStand) {
        setError('Please select a stand.');
        return;
      }
      
      if (quantity <= 0 || quantity > 2) {
        setError('Please select between 1 and 2 tickets.');
        return;
      }
      
      setBookingInProgress(true);
      setError(null);
      setSuccess(null);
      
      const userId = getUserId();
      if (!userId || userId === 'server-side') {
        setError('Session expired. Please try again.');
        setBookingInProgress(false);
        return;
      }
      
      const result = await confirmBooking(userId, matchId, selectedStand, quantity);
      
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          router.push(`/confirmation/${matchId}`);
        }, 2000);
      } else {
        setError(result.message);
        setBookingInProgress(false);
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
      setError('An unexpected error occurred. Please try again.');
      setBookingInProgress(false);
    }
  };
  
  // Format time from seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Loading booking details...</h1>
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full animate-pulse" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error && !success) {
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
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto max-w-2xl">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-600 text-white p-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Book Your Tickets</h1>
              <div className="bg-white text-blue-700 font-bold px-4 py-2 rounded-full flex items-center">
                <svg 
                  className="w-5 h-5 mr-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatTime(timeLeft)}
              </div>
            </div>
            
            {matchDetails && (
              <div className="mt-2">
                <p className="text-lg">{matchDetails.name}</p>
                <p className="text-sm opacity-80">{matchDetails.date} at {matchDetails.venue}</p>
              </div>
            )}
          </div>
          
          <div className="p-6">
            {success ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center mb-4">
                <p className="text-green-700 font-medium">{success}</p>
                <p className="text-sm text-green-600 mt-1">Redirecting to confirmation page...</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-3">Select Stand</h2>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {stands.map((stand) => (
                      <div 
                        key={stand.id} 
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedStand === stand.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                        onClick={() => setSelectedStand(stand.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{stand.stand_name}</p>
                            <p className="text-sm text-gray-600">
                              {stand.available_tickets} tickets available
                            </p>
                          </div>
                          <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center">
                            {selectedStand === stand.id && (
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        
                        {stand.available_tickets === 0 && (
                          <div className="mt-2 text-red-600 text-sm font-medium">
                            ❌ Sold Out
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-3">Number of Tickets</h2>
                  <div className="flex border border-gray-300 rounded-md w-32">
                    <button
                      className="px-3 py-2 text-gray-600 disabled:opacity-50"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      −
                    </button>
                    <div className="flex-grow text-center py-2">{quantity}</div>
                    <button
                      className="px-3 py-2 text-gray-600 disabled:opacity-50"
                      onClick={() => setQuantity(Math.min(2, quantity + 1))}
                      disabled={quantity >= 2}
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Maximum 2 tickets per booking</p>
                </div>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-red-600">{error}</p>
                  </div>
                )}
                
                <button
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded disabled:opacity-70"
                  onClick={handleConfirmBooking}
                  disabled={bookingInProgress || timeLeft <= 0 || 
                    !selectedStand || 
                    !stands.find(s => s.id === selectedStand)?.available_tickets}
                >
                  {bookingInProgress ? 'Processing...' : 'Confirm Booking'}
                </button>
                
                <p className="text-sm text-gray-500 text-center mt-4">
                  You have {formatTime(timeLeft)} to complete your booking
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
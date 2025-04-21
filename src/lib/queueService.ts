'use client';

import { v4 as uuidv4 } from 'uuid';
import supabase from './supabase';

// Generate a unique user ID if one doesn't exist in the local storage
export const getUserId = (): string => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return 'server-side';
  }

  let userId = localStorage.getItem('ipl_booking_user_id');
  
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem('ipl_booking_user_id', userId);
  }
  
  return userId;
};

// Join the queue for a match
export const joinQueue = async (matchId: string): Promise<{ success: boolean; error?: unknown; queueId?: number }> => {
  try {
    const userId = getUserId();
    
    // If we're server-side, don't proceed
    if (userId === 'server-side') {
      return { success: false, error: 'Cannot join queue on the server side' };
    }
    
    // Check if user is already in queue for this match
    const { data: existingQueue } = await supabase
      .from('queue')
      .select('id, status')
      .eq('user_id', userId)
      .eq('match_id', matchId)
      .single();
    
    // If user already has an active queue entry, return it
    if (existingQueue && ['waiting', 'processing'].includes(existingQueue.status)) {
      return { success: true, queueId: existingQueue.id };
    }
    
    // Otherwise create a new queue entry
    const { data, error } = await supabase
      .from('queue')
      .insert([
        { 
          user_id: userId,
          match_id: matchId,
          status: 'waiting'
        }
      ])
      .select('id')
      .single();
    
    if (error) throw error;
    
    return { success: true, queueId: data.id };
  } catch (error) {
    console.error('Error joining queue:', error);
    return { success: false, error };
  }
};

// Get the number of people ahead in the queue
export const getQueuePosition = async (userId: string, matchId: string): Promise<number | null> => {
  try {
    // Get this user's joined_at timestamp
    const { data: userData, error: userError } = await supabase
      .from('queue')
      .select('joined_at')
      .eq('match_id', matchId)
      .eq('user_id', userId)
      .single();
    
    if (userError) throw userError;
    
    // Count users with earlier timestamps and 'waiting' status
    const { count, error: countError } = await supabase
      .from('queue')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', matchId)
      .eq('status', 'waiting')
      .lt('joined_at', userData.joined_at);
    
    if (countError) throw countError;
    
    return count;
  } catch (error) {
    console.error('Error getting queue position:', error);
    return null;
  }
};

// Check if the user is at the front of the queue and update status if they are
export const checkMyTurn = async (matchId: string, userId: string): Promise<boolean> => {
  try {
    // Get earliest waiting user in the queue for this match
    const { data: earliestUser, error: queueError } = await supabase
      .from('queue')
      .select('user_id')
      .eq('match_id', matchId)
      .eq('status', 'waiting')
      .order('joined_at', { ascending: true })
      .limit(1)
      .single();
    
    if (queueError) {
      console.error('Error checking queue:', queueError);
      return false;
    }
    
    // If the earliest waiting user is this user, update their status to processing
    if (earliestUser && earliestUser.user_id === userId) {
      const { error: updateError } = await supabase
        .from('queue')
        .update({ status: 'processing' })
        .eq('match_id', matchId)
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('Error updating queue status:', updateError);
        return false;
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking turn:', error);
    return false;
  }
};

// Confirm booking with transaction
export const confirmBooking = async (
  userId: string, 
  matchId: string, 
  standId: string, 
  quantity: number
): Promise<{ success: boolean; message: string }> => {
  try {
    // Get current available tickets
    const { data: standData, error: standError } = await supabase
      .from('stands')
      .select('available_tickets')
      .eq('id', standId)
      .single();
    
    if (standError) throw standError;
    
    // Check if enough tickets are available
    if (!standData || standData.available_tickets < quantity) {
      return { 
        success: false, 
        message: 'Not enough tickets available. Please select a different stand or quantity.' 
      };
    }
    
    // Start a transaction by using multiple operations
    // 1. Update available tickets
    const { error: updateError } = await supabase
      .from('stands')
      .update({ available_tickets: standData.available_tickets - quantity })
      .eq('id', standId);
    
    if (updateError) throw updateError;
    
    // 2. Update user's queue status to completed
    const { error: queueError } = await supabase
      .from('queue')
      .update({ status: 'completed' })
      .eq('match_id', matchId)
      .eq('user_id', userId);
    
    if (queueError) {
      // If there was an error updating the queue, try to rollback the ticket change
      // This is not a perfect transaction, but it attempts to maintain consistency
      await supabase
        .from('stands')
        .update({ available_tickets: standData.available_tickets })
        .eq('id', standId);
      
      throw queueError;
    }
    
    return { 
      success: true, 
      message: `Successfully booked ${quantity} ticket(s)!` 
    };
  } catch (error) {
    console.error('Error confirming booking:', error);
    return { 
      success: false, 
      message: 'An error occurred while processing your booking. Please try again.' 
    };
  }
}; 
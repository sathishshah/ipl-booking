export interface Match {
  id: string;
  match_name: string;
  match_datetime: string;
  booking_opens_at: string;
  venue: string;
}

export interface Stand {
  id: string;
  match_id: string;
  stand_name: string;
  total_tickets: number;
  available_tickets: number;
}

export interface Queue {
  id: number;
  user_id: string;
  match_id: string;
  joined_at: string;
  status: 'waiting' | 'processing' | 'completed' | 'expired';
} 
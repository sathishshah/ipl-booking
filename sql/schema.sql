-- Create matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_name TEXT NOT NULL,
  match_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  booking_opens_at TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT NOT NULL
);

-- Create stands table
CREATE TABLE stands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  stand_name TEXT NOT NULL,
  total_tickets INTEGER NOT NULL,
  available_tickets INTEGER NOT NULL,
  CONSTRAINT tickets_check CHECK (available_tickets >= 0 AND available_tickets <= total_tickets)
);

-- Insert sample matches data
INSERT INTO matches (match_name, match_datetime, booking_opens_at, venue)
VALUES 
  ('CSK vs KKR', '2023-05-15 19:30:00+05:30', '2023-05-10 12:00:00+05:30', 'M. A. Chidambaram Stadium, Chennai'),
  ('MI vs RCB', '2023-05-18 19:30:00+05:30', '2023-05-12 12:00:00+05:30', 'Wankhede Stadium, Mumbai'),
  ('DC vs PBKS', '2023-05-20 15:30:00+05:30', '2023-05-15 12:00:00+05:30', 'Arun Jaitley Stadium, Delhi');

-- Insert sample stands data for CSK vs KKR match
INSERT INTO stands (match_id, stand_name, total_tickets, available_tickets)
VALUES 
  ((SELECT id FROM matches WHERE match_name = 'CSK vs KKR'), 'Stand A', 1000, 1000),
  ((SELECT id FROM matches WHERE match_name = 'CSK vs KKR'), 'Stand B', 1500, 1500),
  ((SELECT id FROM matches WHERE match_name = 'CSK vs KKR'), 'Stand C', 800, 800);

-- Insert sample stands data for MI vs RCB match
INSERT INTO stands (match_id, stand_name, total_tickets, available_tickets)
VALUES 
  ((SELECT id FROM matches WHERE match_name = 'MI vs RCB'), 'Stand A', 1200, 1200),
  ((SELECT id FROM matches WHERE match_name = 'MI vs RCB'), 'Stand B', 1800, 1800),
  ((SELECT id FROM matches WHERE match_name = 'MI vs RCB'), 'Stand C', 900, 900);

-- Insert sample stands data for DC vs PBKS match
INSERT INTO stands (match_id, stand_name, total_tickets, available_tickets)
VALUES 
  ((SELECT id FROM matches WHERE match_name = 'DC vs PBKS'), 'Stand A', 1100, 1100),
  ((SELECT id FROM matches WHERE match_name = 'DC vs PBKS'), 'Stand B', 1600, 1600),
  ((SELECT id FROM matches WHERE match_name = 'DC vs PBKS'), 'Stand C', 750, 750); 
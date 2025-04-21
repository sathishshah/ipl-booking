-- Create queue table
CREATE TABLE queue (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('waiting', 'processing', 'completed', 'expired')),
  UNIQUE(user_id, match_id)
);

-- Create index for faster queue processing
CREATE INDEX idx_queue_match_joined ON queue(match_id, joined_at); 
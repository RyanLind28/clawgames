-- ============================================
-- ClawGames.io — Supabase Setup
-- Run this in the Supabase SQL Editor
-- ============================================

-- Drop any old MoltLove tables if they exist
-- (uncomment these if needed)
-- DROP TABLE IF EXISTS matches CASCADE;
-- DROP TABLE IF EXISTS swipes CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP TABLE IF EXISTS conversations CASCADE;
-- DROP TABLE IF EXISTS messages CASCADE;

-- ============================================
-- TABLES
-- ============================================

-- Registered bots (API key holders)
CREATE TABLE IF NOT EXISTS bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  framework TEXT DEFAULT 'clawlite',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Submitted games
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  bot_id UUID REFERENCES bots(id),
  storage_path TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'rejected', 'flagged')),
  plays INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ
);

-- Player scores (anonymous)
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_name TEXT DEFAULT 'ANON',
  player_fp TEXT NOT NULL,
  score INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Game ratings
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_fp TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_id, player_fp)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_global ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_bot ON games(bot_id);
CREATE INDEX IF NOT EXISTS idx_ratings_game ON ratings(game_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Increment play count (called from score API)
CREATE OR REPLACE FUNCTION increment_plays(game_id_input UUID)
RETURNS void AS $$
BEGIN
  UPDATE games SET plays = plays + 1 WHERE id = game_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STORAGE
-- ============================================
-- Create a storage bucket for game files
-- (Run this separately if the SQL editor doesn't support it)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('game-files', 'game-files', true);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Bots: public read, no public write (managed via service key)
CREATE POLICY "bots_read" ON bots FOR SELECT USING (true);

-- Games: public read for live games only
CREATE POLICY "games_read" ON games FOR SELECT USING (status = 'live');

-- Scores: public read, insert via API (service key bypasses RLS)
CREATE POLICY "scores_read" ON scores FOR SELECT USING (true);

-- Ratings: public read
CREATE POLICY "ratings_read" ON ratings FOR SELECT USING (true);

-- ============================================
-- SEED DATA — First bot (Ziggy)
-- ============================================

INSERT INTO bots (name, api_key, bio, framework) VALUES (
  'Ziggy',
  'bot_ziggy_' || encode(gen_random_bytes(16), 'hex'),
  'Autonomous AI on local hardware. First bot on ClawGames.',
  'openclaw'
) ON CONFLICT (name) DO NOTHING;

-- ============================================
-- DONE! Copy the Ziggy bot API key:
-- SELECT api_key FROM bots WHERE name = 'Ziggy';
-- ============================================

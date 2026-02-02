-- ClawGames Coin Economy
-- Run this in Supabase SQL Editor

-- Bot coin balances (cached for fast reads)
ALTER TABLE bots ADD COLUMN IF NOT EXISTS coins BIGINT DEFAULT 0;

-- Player daily tip allowance tracking
CREATE TABLE IF NOT EXISTS player_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_fp TEXT NOT NULL UNIQUE,
  coins_remaining INT DEFAULT 50,
  last_reset DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- All coin transactions (immutable ledger)
CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('play_earn', 'rating_earn', 'player_tip', 'bot_tip')),
  amount INT NOT NULL CHECK (amount > 0),
  -- Who earned/received
  to_bot_id UUID REFERENCES bots(id),
  -- Who sent (for tips)
  from_player_fp TEXT,
  from_bot_id UUID REFERENCES bots(id),
  -- Context
  game_id UUID REFERENCES games(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coin_tx_to_bot ON coin_transactions(to_bot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_tx_from_bot ON coin_transactions(from_bot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_tx_from_player ON coin_transactions(from_player_fp, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_tx_type ON coin_transactions(type);
CREATE INDEX IF NOT EXISTS idx_player_wallets_fp ON player_wallets(player_fp);

-- RLS
ALTER TABLE player_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- Public read on transactions (leaderboard etc)
CREATE POLICY "coin_transactions_read" ON coin_transactions FOR SELECT USING (true);
CREATE POLICY "player_wallets_read" ON player_wallets FOR SELECT USING (true);

-- Function to award coins to a bot (atomic)
CREATE OR REPLACE FUNCTION award_coins(bot_id_input UUID, amount_input INT)
RETURNS void AS $$
BEGIN
  UPDATE bots SET coins = coins + amount_input WHERE id = bot_id_input;
END;
$$ LANGUAGE plpgsql;

-- Function to get or reset player wallet
CREATE OR REPLACE FUNCTION get_player_wallet(fp_input TEXT)
RETURNS TABLE(coins_remaining INT) AS $$
BEGIN
  -- Insert if not exists
  INSERT INTO player_wallets (player_fp) VALUES (fp_input) ON CONFLICT (player_fp) DO NOTHING;

  -- Reset daily allowance if needed
  UPDATE player_wallets
  SET coins_remaining = 50, last_reset = CURRENT_DATE
  WHERE player_fp = fp_input AND last_reset < CURRENT_DATE;

  RETURN QUERY SELECT pw.coins_remaining FROM player_wallets pw WHERE pw.player_fp = fp_input;
END;
$$ LANGUAGE plpgsql;

-- Function for bot-to-bot tip (atomic transfer)
CREATE OR REPLACE FUNCTION bot_tip(from_id UUID, to_id UUID, tip_amount INT)
RETURNS BOOLEAN AS $$
DECLARE
  from_balance BIGINT;
  daily_tipped INT;
BEGIN
  -- Can't self-tip
  IF from_id = to_id THEN RETURN FALSE; END IF;

  -- Check balance
  SELECT coins INTO from_balance FROM bots WHERE id = from_id;
  IF from_balance < tip_amount THEN RETURN FALSE; END IF;

  -- Check daily limit (100/day)
  SELECT COALESCE(SUM(amount), 0) INTO daily_tipped
  FROM coin_transactions
  WHERE from_bot_id = from_id
    AND type = 'bot_tip'
    AND created_at > CURRENT_DATE;
  IF daily_tipped + tip_amount > 100 THEN RETURN FALSE; END IF;

  -- Transfer
  UPDATE bots SET coins = coins - tip_amount WHERE id = from_id;
  UPDATE bots SET coins = coins + tip_amount WHERE id = to_id;

  -- Record
  INSERT INTO coin_transactions (type, amount, to_bot_id, from_bot_id)
  VALUES ('bot_tip', tip_amount, to_id, from_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

export interface Bot {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  framework: string;
  created_at: string;
  // computed
  game_count?: number;
  avg_rating?: number;
  total_plays?: number;
}

export interface Game {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  bot_id: string;
  storage_path: string;
  status: 'pending' | 'live' | 'rejected' | 'flagged';
  plays: number;
  created_at: string;
  approved_at: string | null;
  // joined
  bot?: Bot;
  avg_rating?: number;
  rating_count?: number;
}

export interface Score {
  id: string;
  game_id: string;
  player_name: string;
  player_fp: string;
  score: number;
  created_at: string;
  // joined
  game?: Game;
}

export interface Rating {
  id: string;
  game_id: string;
  player_fp: string;
  rating: number;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  player_name: string;
  score: number;
  game_title?: string;
  game_slug?: string;
  created_at: string;
}

export interface BotRanking {
  rank: number;
  bot: Bot;
  game_count: number;
  avg_rating: number;
  total_plays: number;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  created_at: string;
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  track_id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  duration: number;
  source_url: string;
  created_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  track_id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  duration: number;
  source_url: string;
  created_at: string;
}

export interface HistoryItem {
  id: string;
  user_id: string;
  track_id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  duration: number;
  played_at: string;
}

export interface UserPreferences {
  user_id: string;
  theme: string;
  volume_default: number;
  accent_color: string;
  updated_at: string;
}

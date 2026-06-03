import { PlayerTrack } from '../store/usePlayerStore';
import { useUIStore } from '../store/useUIStore';
import { API_BASE } from './config';

export async function trackPlay(track: PlayerTrack) {
  const userId = useUIStore.getState().profile?.id || 'guest';
  try {
    await fetch(`${API_BASE}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, track }),
    });
  } catch (err) {
    console.error('Failed to log play action:', err);
  }
}

export async function trackSkip(trackId: string, completionRate: number) {
  const userId = useUIStore.getState().profile?.id || 'guest';
  try {
    await fetch(`${API_BASE}/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, trackId, completionRate }),
    });
  } catch (err) {
    console.error('Failed to log skip action:', err);
  }
}

export async function trackLike(track: PlayerTrack, isLike: number) {
  const userId = useUIStore.getState().profile?.id || 'guest';
  const endpoint = isLike === 1 ? 'like' : 'dislike';
  try {
    await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, track }),
    });
    // Trigger real-time refresh custom event
    window.dispatchEvent(new Event('sonique_recs_refresh'));
  } catch (err) {
    console.error(`Failed to log like/dislike action:`, err);
  }
}

export async function trackPlaylistAdd(playlistName: string, track: PlayerTrack) {
  const userId = useUIStore.getState().profile?.id || 'guest';
  try {
    await fetch(`${API_BASE}/playlist/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, playlistName, track }),
    });
    window.dispatchEvent(new Event('sonique_recs_refresh'));
  } catch (err) {
    console.error('Failed to log playlist add action:', err);
  }
}

export async function trackGenericAction(actionType: string, metaData: Record<string, any> = {}) {
  const userId = useUIStore.getState().profile?.id || 'guest';
  try {
    await fetch(`${API_BASE}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, actionType, metaData }),
    });
    // Refresh recommendations dynamically
    window.dispatchEvent(new Event('sonique_recs_refresh'));
  } catch (err) {
    console.error(`Failed to log generic action ${actionType}:`, err);
  }
}

export interface RecTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  duration: number;
  confidence?: number;
  genre?: string;
}

export interface HomeShelvesData {
  recommended_for_you: RecTrack[];
  recent_listening_based: RecTrack[];
  artist_focus: { artist: string; tracks: RecTrack[] };
  similar_artists: { id: string; name: string; avatar: string }[];
  daily_mix: RecTrack[];
  trending_now: RecTrack[];
  new_releases: RecTrack[];
  continue_listening: RecTrack[];
  recently_played: RecTrack[];
  discover_new: RecTrack[];
  music_albums?: { id: string; name: string; cover: string }[];
}

export async function getHomeShelves(): Promise<HomeShelvesData | null> {
  const userId = useUIStore.getState().profile?.id || 'guest';
  try {
    const res = await fetch(`${API_BASE}/home?userId=${userId}`);
    if (res.ok) {
      const data = await res.json();
      return data.shelves as HomeShelvesData;
    }
  } catch (err) {
    console.error('Failed to fetch home shelves:', err);
  }
  return null;
}

export interface RecVideo {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  duration: number;
  views?: string;
}

export async function fetchTrendingVideos(): Promise<RecVideo[]> {
  try {
    const res = await fetch(`${API_BASE}/videos/trending`);
    if (res.ok) {
      const data = await res.json();
      return data.videos || [];
    }
  } catch (err) {
    console.error('Failed to fetch trending videos:', err);
  }
  return [];
}

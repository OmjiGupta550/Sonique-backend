// Redirects all music queries to our local Python Flask YouTube Music backend on port 5000.
// Keeps standard interfaces unchanged for complete backward compatibility.
import albumCoversMapping from './album_covers_mapping.json';
import { API_URL as API_ROOT } from './config';
const mapping: Record<string, string> = albumCoversMapping;

export interface SaavnTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  duration: number;
  sourceUrl: string;
}

export interface SaavnPlaylistDetails {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  songCount: number;
  tracks: SaavnTrack[];
}

export interface SaavnArtistDetails {
  id: string;
  name: string;
  avatarUrl: string | null;
  followerCount: number;
  tracks: SaavnTrack[];
}

export async function searchSaavnSongs(query: string, limit = 50): Promise<SaavnTrack[]> {
  if (!query) return [];

  try {
    const res = await fetch(`${API_ROOT}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return [];

    const json = await res.json();
    const songs = json.songs || [];

    return songs.map((s: any) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      coverUrl: mapping[s.id] || s.thumbnail || null,
      duration: s.duration,
      sourceUrl: `${API_ROOT}/api/stream/${s.id}?redirect=true`
    }));
  } catch (err) {
    console.error('Error searching YouTube Music API:', err);
    return [];
  }
}

export async function fetchSaavnPlaylist(playlistId: string): Promise<SaavnPlaylistDetails | null> {
  try {
    const res = await fetch(`${API_ROOT}/api/playlist/${playlistId}`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;

    const json = await res.json();
    const coverUrl = json.thumbnails && json.thumbnails.length > 0 
      ? json.thumbnails[json.thumbnails.length - 1]?.url 
      : (json.tracks && json.tracks[0]?.videoId 
        ? `https://img.youtube.com/vi/${json.tracks[0].videoId}/0.jpg` 
        : null);
    
    const tracks = (json.tracks || []).map((t: any) => {
      const trackId = t.videoId;
      const trackCover = mapping[trackId] || (t.thumbnails && t.thumbnails.length > 0 
        ? t.thumbnails[t.thumbnails.length - 1]?.url 
        : (coverUrl || (trackId ? `https://img.youtube.com/vi/${trackId}/0.jpg` : null)));
      return {
        id: trackId,
        title: t.title,
        artist: (t.artists || []).map((a: any) => a.name).join(', '),
        coverUrl: trackCover,
        duration: t.duration_seconds || 180,
        sourceUrl: `${API_ROOT}/api/stream/${trackId}?redirect=true`
      };
    });

    return {
      id: playlistId,
      name: json.title,
      description: json.description || null,
      coverUrl,
      songCount: json.trackCount || tracks.length,
      tracks
    };
  } catch (err) {
    console.error('Error fetching playlist details:', err);
    return null;
  }
}

export async function fetchSaavnAlbum(albumId: string): Promise<SaavnPlaylistDetails | null> {
  try {
    const res = await fetch(`${API_ROOT}/api/album/${albumId}`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;

    const json = await res.json();
    const coverUrl = json.thumbnails && json.thumbnails.length > 0 
      ? json.thumbnails[json.thumbnails.length - 1]?.url 
      : (json.tracks && json.tracks[0]?.videoId 
        ? `https://img.youtube.com/vi/${json.tracks[0].videoId}/0.jpg` 
        : null);

    const tracks = (json.tracks || []).map((t: any) => {
      const trackId = t.videoId;
      const trackCover = mapping[trackId] || (t.thumbnails && t.thumbnails.length > 0 
        ? t.thumbnails[t.thumbnails.length - 1]?.url 
        : (coverUrl || (trackId ? `https://img.youtube.com/vi/${trackId}/0.jpg` : null)));
      return {
        id: trackId,
        title: t.title,
        artist: (t.artists || []).map((a: any) => a.name).join(', '),
        coverUrl: trackCover,
        duration: t.duration_seconds || 180,
        sourceUrl: `${API_ROOT}/api/stream/${trackId}?redirect=true`
      };
    });

    return {
      id: albumId,
      name: json.title,
      description: json.description || (json.year ? `${json.year} Album` : 'Album compilation'),
      coverUrl,
      songCount: json.trackCount || tracks.length,
      tracks
    };
  } catch (err) {
    console.error('Error fetching album details:', err);
    return null;
  }
}

export async function fetchSaavnArtist(artistId: string): Promise<SaavnArtistDetails | null> {
  try {
    const res = await fetch(`${API_ROOT}/api/artist/${artistId}`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;

    const json = await res.json();
    const avatarUrl = json.thumbnails ? json.thumbnails[json.thumbnails.length - 1]?.url : null;

    // Parse subscribers string to approximate integer count
    let followers = 1000000;
    if (json.subscribers) {
      const m = json.subscribers.match(/([\d\.]+)\s*([MKmk]?)/);
      if (m) {
        const val = parseFloat(m[1]);
        const unit = m[2].toLowerCase();
        if (unit === 'm') followers = Math.floor(val * 1000000);
        else if (unit === 'k') followers = Math.floor(val * 1000);
        else followers = Math.floor(val);
      }
    }

    const songsList = ((json.songs ? json.songs.results : json.tracks) || []);
    let tracks = songsList.map((t: any) => {
      const videoId = t.videoId || t.id;
      const trackCover = mapping[videoId] || (t.thumbnails && t.thumbnails.length > 0 
        ? t.thumbnails[t.thumbnails.length - 1]?.url 
        : (avatarUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/0.jpg` : 'https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=200&auto=format&fit=crop')));
      return {
        id: videoId,
        title: t.title,
        artist: (t.artists || []).map((a: any) => a.name).join(', ') || json.name,
        coverUrl: trackCover,
        duration: t.duration_seconds || 180,
        sourceUrl: `${API_ROOT}/api/stream/${videoId}?redirect=true`
      };
    });

    // Dynamic padding: If the artist has fewer than 50 songs, search and append songs dynamically!
    if (tracks.length < 50 && json.name) {
      try {
        const searchTracks = await searchSaavnSongs(json.name, 60);
        const existingIds = new Set(tracks.map((t: any) => t.id));
        for (const st of searchTracks) {
          if (!existingIds.has(st.id)) {
            const trackCover = mapping[st.id] || st.coverUrl || `https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=200&auto=format&fit=crop`;
            tracks.push({
              id: st.id,
              title: st.title,
              artist: st.artist,
              coverUrl: trackCover,
              duration: st.duration,
              sourceUrl: st.sourceUrl
            });
            existingIds.add(st.id);
          }
          if (tracks.length >= 50) break; // Fetch up to 50 songs dynamically
        }
      } catch (e) {
        console.error('Failed to pad artist top tracks:', e);
      }
    }

    return {
      id: artistId,
      name: json.name,
      avatarUrl: avatarUrl || `https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=200&auto=format&fit=crop`,
      followerCount: followers,
      tracks
    };
  } catch (err) {
    console.error('Error fetching artist details:', err);
    return null;
  }
}

// Audius API helper
// Fetches healthy API nodes and provides functions to query music metadata and streams.

let healthyNode: string | null = null;

async function getAudiusNode(): Promise<string> {
  if (healthyNode) return healthyNode;

  try {
    const res = await fetch('https://api.audius.co');
    const data = await res.json();
    const nodes = data.data || [];
    if (nodes.length > 0) {
      // Pick a random node for load balancing
      const randomIndex = Math.floor(Math.random() * nodes.length);
      healthyNode = nodes[randomIndex];
      return healthyNode!;
    }
  } catch (error) {
    console.error('Error fetching Audius nodes:', error);
  }

  // Fallback node if API is down or failed
  return 'https://audius-metadata-5.figment.io';
}

export interface AudiusTrack {
  id: string;
  title: string;
  duration: number; // in seconds
  artwork: {
    '150x150'?: string;
    '480x480'?: string;
    '1000x1000'?: string;
  };
  description: string | null;
  genre: string;
  mood: string | null;
  release_date: string | null;
  user: {
    id: string;
    name: string;
    handle: string;
    profile_picture: {
      '150x150'?: string;
      '480x480'?: string;
    } | null;
  };
  play_count: number;
}

export interface AudiusArtist {
  id: string;
  name: string;
  handle: string;
  bio: string | null;
  location: string | null;
  profile_picture: {
    '150x150'?: string;
    '480x480'?: string;
  } | null;
  cover_photo: {
    '640x'?: string;
    '2000x'?: string;
  } | null;
  follower_count: number;
  followee_count: number;
  track_count: number;
}

export interface AudiusPlaylist {
  id: string;
  playlist_name: string;
  description: string | null;
  artwork: {
    '150x150'?: string;
    '480x480'?: string;
    '1000x1000'?: string;
  } | null;
  user: {
    id: string;
    name: string;
  };
  track_count: number;
}

export async function fetchTrendingTracks(): Promise<AudiusTrack[]> {
  try {
    const node = await getAudiusNode();
    const res = await fetch(`${node}/v1/tracks/trending?app_name=sonique_app`);
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching trending tracks:', error);
    return [];
  }
}

export async function fetchNewReleases(): Promise<AudiusTrack[]> {
  // Audius doesn't have a direct "new releases" endpoint, we can search for latest tracks
  // or fetch trending and shuffle/slice them, or use search with an empty string or standard search query.
  // Let's search with empty query or get popular electronic/pop tracks
  try {
    const node = await getAudiusNode();
    const res = await fetch(`${node}/v1/tracks/search?query=lofi&app_name=sonique_app`);
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching new releases:', error);
    return [];
  }
}

export async function fetchRecommendations(): Promise<AudiusTrack[]> {
  // Let's get recommended tracks (we can query another popular genre like Chill or Synthwave)
  try {
    const node = await getAudiusNode();
    const res = await fetch(`${node}/v1/tracks/search?query=synthwave&app_name=sonique_app`);
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
}

export async function searchTracks(query: string): Promise<AudiusTrack[]> {
  if (!query) return [];
  try {
    const node = await getAudiusNode();
    const res = await fetch(`${node}/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=sonique_app`);
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('Error searching tracks:', error);
    return [];
  }
}

export async function searchArtists(query: string): Promise<AudiusArtist[]> {
  if (!query) return [];
  try {
    const node = await getAudiusNode();
    const res = await fetch(`${node}/v1/users/search?query=${encodeURIComponent(query)}&app_name=sonique_app`);
    const data = await res.json();
    // Filter users to get those with track counts (artists)
    const users: AudiusArtist[] = data.data || [];
    return users;
  } catch (error) {
    console.error('Error searching artists:', error);
    return [];
  }
}

export async function searchPlaylists(query: string): Promise<AudiusPlaylist[]> {
  if (!query) return [];
  try {
    const node = await getAudiusNode();
    const res = await fetch(`${node}/v1/playlists/search?query=${encodeURIComponent(query)}&app_name=sonique_app`);
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('Error searching playlists:', error);
    return [];
  }
}

export async function fetchArtistDetails(artistId: string): Promise<AudiusArtist | null> {
  try {
    const node = await getAudiusNode();
    const res = await fetch(`${node}/v1/users/${artistId}?app_name=sonique_app`);
    const data = await res.json();
    return data.data || null;
  } catch (error) {
    console.error('Error fetching artist details:', error);
    return null;
  }
}

export async function fetchArtistTracks(artistId: string): Promise<AudiusTrack[]> {
  try {
    const node = await getAudiusNode();
    const res = await fetch(`${node}/v1/users/${artistId}/tracks?app_name=sonique_app`);
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching artist tracks:', error);
    return [];
  }
}

export async function fetchTrackDetails(trackId: string): Promise<AudiusTrack | null> {
  try {
    const node = await getAudiusNode();
    const res = await fetch(`${node}/v1/tracks/${trackId}?app_name=sonique_app`);
    const data = await res.json();
    return data.data || null;
  } catch (error) {
    console.error('Error fetching track details:', error);
    return null;
  }
}

export async function getStreamUrl(trackId: string): Promise<string> {
  const node = await getAudiusNode();
  // Return the direct streaming endpoint.
  // Note: Audius streaming URLs redirect to the actual file location.
  // Standard HTMLAudioElement handles redirects seamlessly.
  return `${node}/v1/tracks/${trackId}/stream?app_name=sonique_app`;
}

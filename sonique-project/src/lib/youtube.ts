// YouTube Music / Piped API helper
// Allows searching and streaming Bollywood, Hollywood, and global mainstream songs.
import { API_BASE } from './config';

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.yt',
  'https://piped-api.lunar.icu',
  'https://pipedapi.us.to'
];

let currentInstanceIndex = 0;

function getPipedInstance(): string {
  return PIPED_INSTANCES[currentInstanceIndex];
}

function rotateInstance() {
  currentInstanceIndex = (currentInstanceIndex + 1) % PIPED_INSTANCES.length;
}

export interface YtTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl: string | null;
  duration: number; // in seconds
  sourceUrl: string; // resolved streaming URL
}

// Cleans track titles (removes "Official Video", "(Lyrics)", etc. to improve lyrics matching)
export function cleanTitleAndArtist(title: string, artist: string) {
  let cleanTitle = title
    .replace(/\s*[\(\[][^)]*official[^)]*[\)\]]/gi, '')
    .replace(/\s*[\(\[][^)]*video[^)]*[\)\]]/gi, '')
    .replace(/\s*[\(\[][^)]*audio[^)]*[\)\]]/gi, '')
    .replace(/\s*[\(\[][^)]*lyrics[^)]*[\)\]]/gi, '')
    .replace(/\s*[\(\[][^)]*remix[^)]*[\)\]]/gi, '')
    .replace(/\s*[\(\[][^)]*HD[^)]*[\)\]]/gi, '')
    .trim();

  let cleanArtist = artist
    .replace(/\s*-\s*Topic/i, '')
    .replace(/\s*VEVO/i, '')
    .trim();

  return { cleanTitle, cleanArtist };
}

export async function searchYtMusic(query: string): Promise<YtTrack[]> {
  if (!query) return [];

  let attempts = 0;
  while (attempts < PIPED_INSTANCES.length) {
    const instance = getPipedInstance();
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('Status code not 200');
      
      const data = await res.json();
      const items = data.items || [];
      
      return items
        .filter((item: any) => item.type === 'stream')
        .map((item: any) => {
          const videoId = item.url ? item.url.split('v=')[1] : '';
          const { cleanTitle, cleanArtist } = cleanTitleAndArtist(item.title, item.uploaderName);
          return {
            id: videoId || Math.random().toString(),
            title: cleanTitle,
            artist: cleanArtist,
            coverUrl: item.thumbnail || null,
            duration: item.duration || 180,
            // Lazy load stream URL dynamically upon play to conserve bandwidth and handle temporary links
            sourceUrl: `${API_BASE}/stream/${videoId}?redirect=true`
          };
        });
    } catch (err) {
      console.warn(`Piped instance ${instance} failed. Retrying next...`, err);
      rotateInstance();
      attempts++;
    }
  }
  
  return [];
}

export async function getDirectAudioStream(videoId: string): Promise<string | null> {
  let attempts = 0;
  while (attempts < PIPED_INSTANCES.length) {
    const instance = getPipedInstance();
    try {
      const url = `${instance}/streams/${videoId}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error('Status not ok');
      const data = await res.json();
      
      const audioStreams = data.audioStreams || [];
      if (audioStreams.length > 0) {
        // Sort streams by quality (highest bitrate first or pick medium standard)
        // Typically, m4a format has great standard compatibility and headers
        const m4aStreams = audioStreams.filter((s: any) => s.mimeType && s.mimeType.includes('audio/mp4'));
        const selected = m4aStreams.length > 0 ? m4aStreams[0] : audioStreams[0];
        return selected.url || null;
      }
    } catch (err) {
      console.warn(`Piped stream extraction from ${instance} failed. Retrying...`, err);
      rotateInstance();
      attempts++;
    }
  }
  
  return null;
}

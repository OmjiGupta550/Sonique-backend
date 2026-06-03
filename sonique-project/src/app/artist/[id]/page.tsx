'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchSaavnArtist, SaavnArtistDetails } from '../../../lib/saavn';
import { useUIStore } from '../../../store/useUIStore';
import { usePlayerStore, PlayerTrack } from '../../../store/usePlayerStore';
import { TrackRow } from '../../../components/track/TrackRow';
import { User, Play, Calendar, Music, Sparkles } from 'lucide-react';

export default function ArtistPage() {
  const params = useParams();
  const router = useRouter();
  const artistId = params.id as string;

  const [artist, setArtist] = useState<SaavnArtistDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const { accentColor } = useUIStore();
  const { playPlaylist } = usePlayerStore();

  const loadArtistDetails = async () => {
    try {
      const details = await fetchSaavnArtist(artistId);
      if (!details) {
        router.push('/');
        return;
      }
      setArtist(details);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (artistId) {
      loadArtistDetails();
    }
  }, [artistId]);

  const convertToPlayerTrack = (t: any): PlayerTrack => ({
    id: t.id,
    title: t.title,
    artist: t.artist,
    coverUrl: t.coverUrl,
    duration: t.duration,
    sourceUrl: t.sourceUrl
  });

  const handlePlayArtist = () => {
    if (!artist) return;
    const list = artist.tracks.map(convertToPlayerTrack);
    playPlaylist(list, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div 
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `${accentColor} transparent transparent transparent` }}
        />
      </div>
    );
  }

  if (!artist) return null;

  return (
    <div className="space-y-6 pb-8 select-none">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 border-b border-white/5 pb-6">
        
        {/* Cover Bubble */}
        <div className="w-40 h-40 rounded-full bg-zinc-900 border border-white/10 overflow-hidden shadow-xl shrink-0 flex items-center justify-center">
          {artist.avatarUrl ? (
            <img src={artist.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-16 h-16 text-zinc-700" />
          )}
        </div>

        {/* Text Metadata */}
        <div className="text-center sm:text-left flex-1 space-y-2">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Verified Artist</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">{artist.name}</h1>
          
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-zinc-500 mt-2 font-medium">
            <span>{artist.followerCount.toLocaleString()} Monthly Listeners</span>
            <span>•</span>
            <span>{artist.tracks.length} Top Songs</span>
          </div>
        </div>

        {/* Artist Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {artist.tracks.length > 0 && (
            <button
              onClick={handlePlayArtist}
              className="flex items-center gap-2 font-bold py-2.5 px-6 rounded-full text-zinc-950 transition hover:scale-105 active:scale-95 shadow-md"
              style={{ backgroundColor: accentColor }}
            >
              <Play className="w-4 h-4 fill-zinc-950" />
              <span>Play Top Tracks</span>
            </button>
          )}
        </div>

      </div>

      {/* Tracks List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-white">Popular Songs</h2>
        <div className="flex flex-col gap-2">
          {artist.tracks.map((track, idx) => {
            const playerTrack = convertToPlayerTrack(track);
            return (
              <TrackRow
                key={track.id}
                track={playerTrack}
                index={idx}
              />
            );
          })}

          {artist.tracks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-center gap-2">
              <Music className="w-12 h-12 stroke-1 opacity-40 text-zinc-600" />
              <h4 className="text-zinc-300 font-semibold">No Top Tracks Found</h4>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

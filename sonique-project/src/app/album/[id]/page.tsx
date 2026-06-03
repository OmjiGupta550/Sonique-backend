'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchSaavnAlbum, SaavnPlaylistDetails } from '../../../lib/saavn';
import { useUIStore } from '../../../store/useUIStore';
import { usePlayerStore, PlayerTrack } from '../../../store/usePlayerStore';
import { TrackRow } from '../../../components/track/TrackRow';
import { Disc, Play, Calendar, Music } from 'lucide-react';

export default function AlbumPage() {
  const params = useParams();
  const router = useRouter();
  const albumId = params.id as string;

  const [album, setAlbum] = useState<SaavnPlaylistDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const { accentColor } = useUIStore();
  const { playPlaylist } = usePlayerStore();

  const loadAlbumDetails = async () => {
    try {
      if (!albumId) return;
      const details = await fetchSaavnAlbum(albumId);
      if (!details) {
        router.push('/');
        return;
      }
      setAlbum(details);
    } catch (err) {
      console.error('Error loading album details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlbumDetails();
  }, [albumId]);

  const handlePlayAlbum = () => {
    if (!album || album.tracks.length === 0) return;
    
    const playerTracks: PlayerTrack[] = album.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      coverUrl: t.coverUrl,
      duration: t.duration,
      sourceUrl: t.sourceUrl
    }));
    
    playPlaylist(playerTracks, 0);
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

  if (!album) return null;

  return (
    <div className="space-y-6 pb-8 select-none">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 border-b border-white/5 pb-6">
        
        {/* Cover */}
        <div className="w-40 h-40 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden flex items-center justify-center shadow-xl shrink-0">
          {album.coverUrl ? (
            <img src={album.coverUrl} alt={album.name} className="w-full h-full object-cover" />
          ) : (
            <Disc className="w-16 h-16 text-zinc-700 animate-spin-slow" />
          )}
        </div>

        {/* Text Metadata */}
        <div className="text-center sm:text-left flex-1 space-y-2">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            Album
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">{album.name}</h1>
          <p className="text-sm text-zinc-400 max-w-xl">{album.description || 'Album compilation'}</p>
          
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-zinc-500 mt-2 font-medium">
            <span>{album.songCount} Songs</span>
          </div>
        </div>

        {/* Album Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {album.tracks.length > 0 && (
            <button
              onClick={handlePlayAlbum}
              className="flex items-center gap-2 font-bold py-2.5 px-6 rounded-full text-zinc-950 transition hover:scale-105 active:scale-95 shadow-md"
              style={{ backgroundColor: accentColor }}
            >
              <Play className="w-4 h-4 fill-zinc-950" />
              <span>Play Album</span>
            </button>
          )}
        </div>

      </div>

      {/* Tracks List */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          {album.tracks.map((track, idx) => (
            <TrackRow
              key={`${track.id}-${idx}`}
              track={{
                id: track.id,
                title: track.title,
                artist: track.artist,
                coverUrl: track.coverUrl,
                duration: track.duration,
                sourceUrl: track.sourceUrl
              }}
              index={idx}
            />
          ))}

          {album.tracks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-center gap-2">
              <Music className="w-12 h-12 stroke-1 opacity-40 text-zinc-600" />
              <h4 className="text-zinc-300 font-semibold">Album is Empty</h4>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

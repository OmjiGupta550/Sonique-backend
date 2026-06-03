'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase, Playlist } from '../../../lib/supabase';
import { fetchSaavnPlaylist, SaavnPlaylistDetails, SaavnTrack } from '../../../lib/saavn';
import { useUIStore } from '../../../store/useUIStore';
import { usePlayerStore, PlayerTrack } from '../../../store/usePlayerStore';
import { TrackRow } from '../../../components/track/TrackRow';
import { Disc, Play, Trash2, Calendar, Music } from 'lucide-react';

export default function PlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const playlistId = params.id as string;

  const [playlist, setPlaylist] = useState<{ name: string; description: string | null; coverUrl: string | null; created_at?: string } | null>(null);
  const [tracks, setTracks] = useState<PlayerTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCurated, setIsCurated] = useState(false);

  const { profile, deletePlaylist, accentColor } = useUIStore();
  const { playPlaylist } = usePlayerStore();

  const loadPlaylistDetails = async () => {
    try {
      const isSaavn = /^\d+$/.test(playlistId);
      setIsCurated(isSaavn);

      if (isSaavn) {
        // Load curated JioSaavn Playlist
        const details = await fetchSaavnPlaylist(playlistId);
        if (!details) {
          router.push('/library');
          return;
        }

        setPlaylist({
          name: details.name,
          description: details.description,
          coverUrl: details.coverUrl
        });
        
        setTracks(details.tracks.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          coverUrl: t.coverUrl,
          duration: t.duration,
          sourceUrl: t.sourceUrl
        })));
      } else {
        // Load custom Supabase Playlist
        const { data: pl } = await supabase
          .from('playlists')
          .select('*')
          .eq('id', playlistId)
          .single();

        if (!pl) {
          router.push('/library');
          return;
        }

        // Get playlist tracks
        const { data: list } = await supabase
          .from('playlist_tracks')
          .select('*')
          .eq('playlist_id', playlistId)
          .order('created_at', { ascending: true });

        setPlaylist({
          name: pl.name,
          description: pl.description,
          coverUrl: pl.cover_url,
          created_at: pl.created_at
        });
        
        setTracks((list || []).map((pt) => ({
          id: pt.track_id,
          title: pt.title,
          artist: pt.artist,
          coverUrl: pt.cover_url || null,
          duration: pt.duration,
          sourceUrl: pt.source_url
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (playlistId) {
      loadPlaylistDetails();
    }
  }, [playlistId]);

  const handlePlayPlaylist = () => {
    playPlaylist(tracks, 0);
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (isCurated) return;
    try {
      await supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId);

      setTracks(tracks.filter((t) => t.id !== trackId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePlaylist = async () => {
    if (isCurated) return;
    if (confirm('Are you sure you want to delete this playlist?')) {
      await deletePlaylist(playlistId);
      router.push('/library?tab=playlists');
    }
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

  if (!playlist) return null;

  return (
    <div className="space-y-6 pb-8 select-none">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 border-b border-white/5 pb-6">
        
        {/* Cover */}
        <div className="w-40 h-40 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden flex items-center justify-center shadow-xl">
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Disc className="w-16 h-16 text-zinc-700 animate-spin-slow" />
          )}
        </div>

        {/* Text Metadata */}
        <div className="text-center sm:text-left flex-1 space-y-2">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            {isCurated ? 'Curated Playlist' : 'Custom Playlist'}
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">{playlist.name}</h1>
          <p className="text-sm text-zinc-400 max-w-xl">{playlist.description || 'Curated music compilation.'}</p>
          
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-zinc-500 mt-2 font-medium">
            {!isCurated && playlist.created_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Created {new Date(playlist.created_at).toLocaleDateString()}</span>
              </span>
            )}
            <span>{tracks.length} Songs</span>
          </div>
        </div>

        {/* Playlist Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {tracks.length > 0 && (
            <button
              onClick={handlePlayPlaylist}
              className="flex items-center gap-2 font-bold py-2.5 px-6 rounded-full text-zinc-950 transition hover:scale-105 active:scale-95 shadow-md"
              style={{ backgroundColor: accentColor }}
            >
              <Play className="w-4 h-4 fill-zinc-950" />
              <span>Play</span>
            </button>
          )}

          {!isCurated && profile && (
            <button
              onClick={handleDeletePlaylist}
              className="p-2.5 border border-white/10 rounded-full hover:bg-red-950/20 text-zinc-400 hover:text-red-400 transition"
              title="Delete Playlist"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

      </div>

      {/* Tracks List */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          {tracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              playlistId={isCurated ? undefined : playlistId}
              onRemoveFromPlaylist={isCurated ? undefined : handleRemoveTrack}
            />
          ))}

          {tracks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-center gap-2">
              <Music className="w-12 h-12 stroke-1 opacity-40 text-zinc-600" />
              <h4 className="text-zinc-300 font-semibold">Playlist is Empty</h4>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

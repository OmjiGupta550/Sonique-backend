'use client';

import React from 'react';
import { usePlayerStore, PlayerTrack } from '../../store/usePlayerStore';
import { useUIStore } from '../../store/useUIStore';
import { supabase } from '../../lib/supabase';
import { Play, Pause, Heart, MoreVertical, Trash, Plus } from 'lucide-react';
import { trackPlaylistAdd } from '../../lib/recommendations';

interface TrackRowProps {
  track: PlayerTrack;
  index: number;
  playlistId?: string; // If inside a playlist
  onRemoveFromPlaylist?: (trackId: string) => void;
  showIndex?: boolean;
}

export function TrackRow({ track, index, playlistId, onRemoveFromPlaylist, showIndex = true }: TrackRowProps) {
  const { queue, currentIndex, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { toggleLike, isLiked, accentColor, playlists, profile } = useUIStore();

  const isCurrent = queue[currentIndex]?.id === track.id;

  const handlePlayClick = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track);
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getCoverSrc = (t: typeof track) => {
    const fallback = "/placeholder.png";
    if (t.coverUrl && t.coverUrl.trim() !== '' && t.coverUrl !== 'null' && t.coverUrl !== 'undefined') {
      return t.coverUrl;
    }
    if (t.id && t.id.length === 11) {
      return `https://i.ytimg.com/vi/${t.id}/hqdefault.jpg`;
    }
    return fallback;
  };

  const coverSrc = getCoverSrc(track);

  return (
    <div 
      className={`group flex items-center justify-between p-2.5 rounded-xl transition duration-200 border border-transparent select-none
        ${isCurrent ? 'bg-white/5 border-white/5 shadow-inner' : 'hover:bg-white/5'}`}
    >
      {/* Play/Index & Metadata */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 flex items-center justify-center shrink-0 relative">
          {isCurrent && isPlaying ? (
            <button onClick={handlePlayClick} className="text-white">
              <span className="flex items-end gap-0.5 h-3">
                <span className="w-0.75 bg-current animate-bounce-custom" style={{ animationDelay: '0.1s', backgroundColor: accentColor }} />
                <span className="w-0.75 bg-current animate-bounce-custom" style={{ animationDelay: '0.3s', backgroundColor: accentColor }} />
                <span className="w-0.75 bg-current animate-bounce-custom" style={{ animationDelay: '0.5s', backgroundColor: accentColor }} />
              </span>
            </button>
          ) : (
            <>
              {showIndex && (
                <span className="text-zinc-500 font-semibold text-xs group-hover:opacity-0 transition duration-100">
                  {index + 1}
                </span>
              )}
              <button 
                onClick={handlePlayClick} 
                className={`absolute inset-0 flex items-center justify-center text-white bg-zinc-950/80 rounded-lg shadow-md transition duration-150
                  ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                {isCurrent && isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white translate-x-0.5" />}
              </button>
            </>
          )}
        </div>

        {/* Cover Art */}
        <div className="w-14 h-14 rounded-lg bg-zinc-800 overflow-hidden shrink-0 border border-white/5 shadow-md">
          <img 
            src={coverSrc} 
            alt="" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              if (e.currentTarget.src !== `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg` && track.id && track.id.length === 11) {
                e.currentTarget.src = `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;
              } else {
                e.currentTarget.src = "/placeholder.png";
              }
            }}
          />
        </div>

        {/* Title / Artist */}
        <div className="overflow-hidden pr-2">
          <p 
            className={`text-sm font-semibold truncate ${isCurrent ? 'text-white' : 'text-zinc-200'}`}
            style={{ color: isCurrent ? accentColor : undefined }}
          >
            {track.title}
          </p>
          <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
        </div>
      </div>

      {/* Track Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Track duration */}
        <span className="text-xs text-zinc-500 font-medium hidden sm:inline">
          {formatDuration(track.duration)}
        </span>

        {/* Like Button */}
        <button
          onClick={() => toggleLike(track)}
          className="text-zinc-500 hover:text-white transition"
        >
          <Heart className={`w-4 h-4 ${isLiked(track.id) ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* Playlist Action / Delete */}
        {playlistId && onRemoveFromPlaylist ? (
          <button
            onClick={() => onRemoveFromPlaylist(track.id)}
            className="text-zinc-500 hover:text-red-400 transition"
            title="Remove from playlist"
          >
            <Trash className="w-4 h-4" />
          </button>
        ) : (
          <div className="relative group/menu">
            <button className="text-zinc-500 hover:text-white transition p-1 rounded-full hover:bg-white/5">
              <MoreVertical className="w-4 h-4" />
            </button>
            
            {/* Popover Add to Playlist Dropdown */}
            <div className="absolute right-0 top-6 hidden group-hover/menu:block bg-zinc-900 border border-white/10 rounded-lg shadow-xl py-1 w-44 z-30">
              <p className="text-[10px] font-bold text-zinc-500 px-3 py-1 uppercase tracking-wider">Add to playlist</p>
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={async () => {
                    if (!profile) return;
                    try {
                      // Insert playlist track
                      await supabase.from('playlist_tracks').insert({
                        playlist_id: playlist.id,
                        track_id: track.id,
                        title: track.title,
                        artist: track.artist,
                        cover_url: track.coverUrl,
                        duration: track.duration,
                        source_url: track.sourceUrl
                      });
                      
                      // Log to recommendations system
                      trackPlaylistAdd(playlist.name, track);
                      
                      alert(`Added to ${playlist.name}`);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5 hover:text-white truncate flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {playlist.name}
                </button>
              ))}
              {playlists.length === 0 && (
                <p className="text-xs text-zinc-600 px-3 py-2 italic">No playlists created</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

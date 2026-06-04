'use client';

import React from 'react';
import { usePlayerStore, PlayerTrack } from '../../store/usePlayerStore';
import { useUIStore } from '../../store/useUIStore';
import { Play, Pause, Sparkles } from 'lucide-react';

interface TrackCardProps {
  track: PlayerTrack;
}

export function TrackCard({ track }: TrackCardProps) {
  const { queue, currentIndex, isPlaying, playTrack, togglePlay } = usePlayerStore();
  const { accentColor } = useUIStore();

  const isCurrent = queue[currentIndex]?.id === track.id;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(track);
    }
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
      onClick={handlePlayClick}
      className="group relative bg-zinc-900/40 hover:bg-zinc-800/40 p-4 rounded-xl border border-white/5 transition-all duration-300 cursor-pointer flex flex-col gap-3 shadow-md select-none hover:-translate-y-1 hover:shadow-xl hover:border-white/10"
    >
      {/* Artwork Box */}
      <div className="relative aspect-square w-full rounded-lg bg-zinc-800 overflow-hidden shadow-inner border border-white/5">
        {track.confidence !== undefined && (
          <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[10px] font-bold text-emerald-400 flex items-center gap-1 z-20 shadow-lg">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>{Math.round(track.confidence)}% match</span>
          </div>
        )}
        <img 
          src={coverSrc} 
          alt={track.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.onerror = null;
            if (e.currentTarget.src !== `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg` && track.id && track.id.length === 11) {
              e.currentTarget.src = `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;
            } else {
              e.currentTarget.src = "/placeholder.png";
            }
          }}
        />

        {/* Hover Play Button */}
        <button
          onClick={handlePlayClick}
          className={`absolute bottom-3 right-3 w-11 h-11 rounded-full flex items-center justify-center text-zinc-950 transition-all duration-300 shadow-xl hover:scale-105 active:scale-95
            ${isCurrent 
              ? 'opacity-100 scale-100' 
              : 'opacity-0 scale-90 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0'
            }`}
          style={{ backgroundColor: accentColor }}
        >
          {isCurrent && isPlaying ? (
            <Pause className="w-5 h-5 fill-zinc-950 text-zinc-950" />
          ) : (
            <Play className="w-5 h-5 fill-zinc-950 text-zinc-950 translate-x-0.5" />
          )}
        </button>
      </div>

      {/* Metadata */}
      <div className="flex flex-col overflow-hidden">
        <h4 
          className={`text-sm font-semibold truncate leading-tight transition duration-150 ${isCurrent ? 'text-white' : 'text-zinc-200'}`}
          style={{ color: isCurrent ? accentColor : undefined }}
        >
          {track.title}
        </h4>
        <p className="text-xs text-zinc-400 truncate mt-1">{track.artist}</p>
      </div>
    </div>
  );
}

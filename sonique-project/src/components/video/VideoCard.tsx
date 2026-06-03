'use client';

import React from 'react';
import { RecVideo } from '../../lib/recommendations';
import { useUIStore } from '../../store/useUIStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Play, Eye, Clock } from 'lucide-react';
import { API_BASE } from '../../lib/config';

interface VideoCardProps {
  video: RecVideo;
}

export function VideoCard({ video }: VideoCardProps) {
  const { playVideo, accentColor } = useUIStore();
  const { isPlaying, togglePlay } = usePlayerStore();

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePlayVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Construct PlayerTrack from RecVideo
    const playerTrack = {
      id: video.id,
      title: video.title,
      artist: video.artist,
      coverUrl: video.coverUrl,
      duration: video.duration,
      sourceUrl: `${API_BASE}/stream/video/${video.id}?redirect=true`
    };
    
    // Play video track inside bottom mini player
    usePlayerStore.getState().playTrack(playerTrack, undefined, true);
  };

  return (
    <div
      onClick={handlePlayVideo}
      className="group relative bg-zinc-900/40 hover:bg-zinc-800/40 p-3 rounded-xl border border-white/5 transition-all duration-300 cursor-pointer flex flex-col gap-2.5 shadow-md select-none hover:-translate-y-1 hover:shadow-xl hover:border-white/10 w-64 md:w-72 shrink-0"
    >
      {/* 16:9 Video Cover */}
      <div className="relative aspect-video w-full rounded-lg bg-zinc-850 overflow-hidden shadow-inner border border-white/5">
        
        {/* Views Badge */}
        {video.views && (
          <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[9px] font-bold text-zinc-300 flex items-center gap-1 z-20 shadow-md">
            <Eye className="w-3 h-3 text-zinc-400" />
            <span>{video.views}</span>
          </div>
        )}

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold text-zinc-200 flex items-center gap-0.5 z-20 shadow-md">
          <Clock className="w-3 h-3 text-zinc-400" />
          <span>{formatDuration(video.duration)}</span>
        </div>

        {/* Video Thumbnail */}
        <img
          src={video.coverUrl}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/placeholder.png";
          }}
        />

        {/* Glassmorphic Play Overlay on Hover */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-10">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-zinc-950 shadow-2xl transition duration-300 scale-90 group-hover:scale-100 hover:scale-105 active:scale-95"
            style={{ backgroundColor: accentColor }}
          >
            <Play className="w-5 h-5 fill-zinc-950 text-zinc-950 translate-x-0.5" />
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-col text-left overflow-hidden px-1">
        <h4 className="text-sm font-bold text-white truncate leading-tight group-hover:text-violet-400 transition" style={{ groupHover: { color: accentColor } } as any}>
          {video.title}
        </h4>
        <p className="text-xs text-zinc-400 truncate mt-1">{video.artist}</p>
      </div>
    </div>
  );
}

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useUIStore } from '../../store/useUIStore';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, 
  Volume2, VolumeX, Maximize2, Heart, ListMusic, Tv 
} from 'lucide-react';
import { Slider } from '../ui/Slider';
import { API_BASE } from '../../lib/config';

export function MiniPlayer() {
  const {
    queue,
    shuffledQueue,
    isShuffle,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    togglePlay,
    playTrack,
    next,
    previous,
    seek,
    setCurrentTime,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    showFullscreenPlayer,
    setShowFullscreenPlayer,
    setShowQueueList,
    showQueueList,
    isVideoMode
  } = usePlayerStore();

  const { toggleLike, isLiked, accentColor, playVideo, activeVideoId } = useUIStore();

  const activeQueue = isShuffle ? shuffledQueue : queue;
  const activePlaybackTrack = activeQueue[currentIndex];

  if (!activePlaybackTrack) return null;

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const fallbackCover = "/placeholder.png";
  const coverSrc = activePlaybackTrack.coverUrl && activePlaybackTrack.coverUrl.trim() !== '' ? activePlaybackTrack.coverUrl : fallbackCover;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-zinc-950/80 border-t border-white/5 backdrop-blur-2xl flex flex-col z-40 select-none">
      {/* Top Edge Progress Bar */}
      <div 
        className="w-full h-[3px] bg-zinc-800 cursor-pointer relative"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const pct = clickX / rect.width;
          seek(pct * duration);
        }}
      >
        <div 
          className="h-full transition-all duration-100"
          style={{ 
            width: `${percent}%`,
            backgroundColor: accentColor 
          }}
        />
      </div>

      <div className="flex-1 flex items-center justify-between px-4 md:px-6">
        {/* Left: Metadata */}
        <div className="flex items-center gap-3 w-1/3 min-w-[150px]">
          {isVideoMode ? (
            /* Widescreen YouTube Video Corner Preview Anchor */
            <div 
              className="w-24 h-14 rounded-lg bg-zinc-950 overflow-hidden shrink-0 relative border border-white/10 shadow-md group"
            >
              {activeVideoId === null && !showFullscreenPlayer ? (
                <div 
                  id="youtube-player-placeholder"
                  className="w-full h-full rounded-lg bg-zinc-950"
                />
              ) : (
                <img 
                  src={coverSrc} 
                  alt={activePlaybackTrack.title} 
                  className="w-full h-full object-cover"
                />
              )}
              {/* Corner maximize hover overlay */}
              <div 
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  playVideo(activePlaybackTrack.id);
                }}
                title="Watch Video Fullscreen"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </div>
            </div>
          ) : (
            /* Standard Square Album Art Cover image */
            <div 
              className="w-14 h-14 rounded-lg bg-zinc-800 overflow-hidden shrink-0 cursor-pointer relative group border border-white/5 shadow-md"
              onClick={() => setShowFullscreenPlayer(true)}
            >
              <img 
                src={coverSrc} 
                alt={activePlaybackTrack.title} 
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackCover;
                }}
              />
            </div>
          )}
          
          <div className="overflow-hidden">
            <h4 
              className="text-sm font-semibold text-white truncate cursor-pointer hover:underline"
              onClick={() => setShowFullscreenPlayer(true)}
            >
              {activePlaybackTrack.title}
            </h4>
            <p className="text-xs text-zinc-400 truncate">{activePlaybackTrack.artist}</p>
          </div>

          <button
            onClick={() => toggleLike(activePlaybackTrack)}
            className="text-zinc-400 hover:text-white transition ml-2 shrink-0"
          >
            <Heart 
              className={`w-5 h-5 ${isLiked(activePlaybackTrack.id) ? 'fill-red-500 text-red-500' : ''}`} 
            />
          </button>
        </div>

        {/* Center: Controls */}
        <div className="flex flex-col items-center gap-1 w-1/3">
          <div className="flex items-center gap-4 md:gap-6">
            <button
              onClick={toggleShuffle}
              className={`transition ${isShuffle ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
              style={{ color: isShuffle ? accentColor : undefined }}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={previous}
              className="text-zinc-400 hover:text-white transition"
              title="Previous"
            >
              <SkipBack className="w-5 h-5 fill-zinc-400 hover:fill-white" />
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-950 transition hover:scale-105 active:scale-95 shadow-md"
              style={{ backgroundColor: accentColor }}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-zinc-950" />
              ) : (
                <Play className="w-5 h-5 fill-zinc-950 translate-x-0.5" />
              )}
            </button>

            <button
              onClick={next}
              className="text-zinc-400 hover:text-white transition"
              title="Next"
            >
              <SkipForward className="w-5 h-5 fill-zinc-400 hover:fill-white" />
            </button>

            <button
              onClick={toggleRepeat}
              className={`relative transition ${repeatMode !== 'none' ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
              style={{ color: repeatMode !== 'none' ? accentColor : undefined }}
              title={`Repeat: ${repeatMode}`}
            >
              <Repeat className="w-4 h-4" />
              {repeatMode === 'one' && (
                <span 
                  className="absolute -top-1 -right-1 text-[8px] font-bold rounded-full w-2.5 h-2.5 flex items-center justify-center text-zinc-950"
                  style={{ backgroundColor: accentColor }}
                >
                  1
                </span>
              )}
            </button>
          </div>
          
          {/* Time indicator (visible on desktop) */}
          <div className="hidden md:flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Sound, Queue, Expand */}
        <div className="flex items-center gap-3 w-1/3 justify-end">
          <button
            onClick={() => setShowQueueList(!showQueueList)}
            className={`transition shrink-0 ${showQueueList ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
            style={{ color: showQueueList ? accentColor : undefined }}
            title="Queue"
          >
            <ListMusic className="w-5 h-5" />
          </button>

          {/* Volume */}
          <div className="hidden sm:flex items-center gap-2 w-28 shrink-0">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <Slider
              value={isMuted ? 0 : volume}
              max={1}
              onChange={(v) => setVolume(v)}
              accentColor={accentColor}
            />
          </div>

          {/* Tv Icon representing Active Video Mode Toggle */}
          {activePlaybackTrack.hasVideo && (
            <button
              onClick={() => {
                if (!isVideoMode) {
                  playTrack(activePlaybackTrack, undefined, true);
                }
                playVideo(activePlaybackTrack.id);
              }}
              className={`transition shrink-0 mr-1 p-1 rounded-full ${
                isVideoMode 
                  ? 'text-red-400 bg-red-500/10 border border-red-500/20 shadow-inner animate-pulse hover:scale-105' 
                  : 'text-zinc-400 hover:text-red-400'
              }`}
              title={isVideoMode ? "Watch Video" : "Watch Video"}
            >
              <Tv className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => setShowFullscreenPlayer(true)}
            className="text-zinc-400 hover:text-white transition shrink-0"
            title="Open Lyrics & Fullscreen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}


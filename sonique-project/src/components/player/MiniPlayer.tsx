'use client';

import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useUIStore } from '../../store/useUIStore';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, 
  Volume2, VolumeX, Maximize2, Heart, ListMusic, Tv 
} from 'lucide-react';
import { Slider } from '../ui/Slider';

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

  const { toggleLike, isLiked, accentColor, playVideo } = useUIStore();

  const activeQueue = isShuffle ? shuffledQueue : queue;
  const track = activeQueue[currentIndex];

  if (!track) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
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
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-zinc-950/90 border-t border-white/5 backdrop-blur-2xl z-50 select-none">
      {/* Progress Bar */}
      <div 
        className="w-full h-[3px] bg-zinc-800 cursor-pointer relative" 
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          seek(((e.clientX - rect.left) / rect.width) * duration);
        }}
      >
        <div 
          className="h-full transition-all duration-100" 
          style={{ width: `${progress}%`, backgroundColor: accentColor }} 
        />
      </div>

      <div className="flex items-center justify-between px-4 h-[77px]">
        {/* Left - Artwork Cover (Always active, 100% bug-free) */}
        <div className="flex items-center gap-3 w-1/3 min-w-[150px]">
          <div 
            className="w-14 h-14 rounded-lg overflow-hidden border border-white/5 shadow-md cursor-pointer shrink-0 relative group"
            onClick={togglePlay}
          >
            <img 
              src={coverSrc} 
              alt={track.title} 
              className="w-full h-full object-cover transition duration-300 group-hover:scale-105" 
              onError={(e) => {
                e.currentTarget.onerror = null;
                if (e.currentTarget.src !== `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg` && track.id && track.id.length === 11) {
                  e.currentTarget.src = `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;
                } else {
                  e.currentTarget.src = "/placeholder.png";
                }
              }}
            />
            {/* Hover overlay play/pause indicator */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white translate-x-0.5" />
              )}
            </div>
          </div>

          <div className="overflow-hidden">
            <h4 
              className="text-sm font-semibold text-white truncate cursor-pointer hover:underline"
              onClick={() => setShowFullscreenPlayer(true)}
            >
              {track.title}
            </h4>
            <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
          </div>

          <button onClick={() => toggleLike(track)} className="ml-2 text-zinc-400 hover:text-white transition shrink-0">
            <Heart className={`w-5 h-5 ${isLiked(track.id) ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        </div>

        {/* Center Controls */}
        <div className="flex items-center gap-4 md:gap-6 w-1/3 justify-center">
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
            {isPlaying ? <Pause className="w-5 h-5 fill-zinc-950" /> : <Play className="w-5 h-5 fill-zinc-950 translate-x-0.5" />}
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

        {/* Right Controls */}
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

          {track.hasVideo && (
            <button
              onClick={() => {
                if (!isVideoMode) {
                  playTrack(track, undefined, true);
                }
                playVideo(track.id);
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

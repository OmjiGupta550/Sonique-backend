'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useUIStore } from '../../store/useUIStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat,
  Volume2, VolumeX, Heart, ListMusic, Music2, Moon, Clock, Sparkles, Tv
} from 'lucide-react';
import { Slider } from '../ui/Slider';
import { LyricsPanel } from '../lyrics/LyricsPanel';
import { API_BASE } from '../../lib/config';

export function FullscreenPlayer() {
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
    showFullscreenPlayer,
    sleepTimer,
    sleepTimerActive,
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
    setShowFullscreenPlayer,
    isVideoMode
  } = usePlayerStore();

  const { toggleLike, isLiked, accentColor, setAccentColor, setShowSleepTimerModal, playVideo, activeVideoId } = useUIStore();
  const [activeTab, setActiveTab] = useState<'player' | 'lyrics' | 'queue'>('player');

  const activeQueue = isShuffle ? shuffledQueue : queue;
  const currentTrack = activeQueue[currentIndex];

  // Extract average color from artwork
  useEffect(() => {
    if (!currentTrack || !currentTrack.coverUrl) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = currentTrack.coverUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        // Don't pick pure black/white to maintain styling vibrancy
        const r = Math.max(20, Math.min(220, data[0]));
        const g = Math.max(20, Math.min(220, data[1]));
        const b = Math.max(20, Math.min(220, data[2]));
        
        // Convert to hex
        const rgbToHex = (r: number, g: number, b: number) =>
          '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          }).join('');

        setAccentColor(rgbToHex(r, g, b));
      }
    };
  }, [currentTrack, setAccentColor]);

  if (!showFullscreenPlayer || !currentTrack) return null;

  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <AnimatePresence>
      {/* Widescreen Background Panel (z-[58]) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[58] bg-zinc-950 overflow-hidden pointer-events-none"
      >
        <div 
          className="absolute inset-0 opacity-40 blur-[120px] pointer-events-none transition-all duration-1000 select-none scale-110"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${accentColor} 0%, rgba(9, 9, 11, 0) 60%)`
          }}
        />
      </motion.div>

      {/* Content Panel (z-[60]) */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        className="fixed inset-0 z-[60] flex flex-col overflow-hidden text-white pointer-events-none"
      >
        {/* Top Header */}
        <header className="h-16 sticky top-0 flex items-center justify-between px-6 z-20 border-b border-white/5 bg-zinc-950 transform-gpu pointer-events-auto">
          <button
            onClick={() => setShowFullscreenPlayer(false)}
            className="p-2 rounded-full hover:bg-white/5 transition"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
          
          {/* Centered Tabs */}
          <div className="flex items-center gap-6 font-semibold text-sm">
            <button
              onClick={() => setActiveTab('player')}
              className={`md:hidden py-1 border-b-2 transition ${activeTab === 'player' ? 'text-white' : 'text-zinc-500 hover:text-white border-transparent'}`}
              style={{ borderBottomColor: activeTab === 'player' ? accentColor : 'transparent' }}
            >
              Player
            </button>
            <button
              onClick={() => setActiveTab('lyrics')}
              className={`py-1 border-b-2 transition ${activeTab === 'lyrics' || activeTab === 'player' ? 'text-white' : 'text-zinc-500 hover:text-white border-transparent'}`}
              style={{ borderBottomColor: activeTab === 'lyrics' || activeTab === 'player' ? accentColor : 'transparent' }}
            >
              Lyrics
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`py-1 border-b-2 transition ${activeTab === 'queue' ? 'text-white' : 'text-zinc-500 hover:text-white border-transparent'}`}
              style={{ borderBottomColor: activeTab === 'queue' ? accentColor : 'transparent' }}
            >
              Up Next
            </button>
          </div>

          <div className="flex items-center gap-2">
            {sleepTimerActive && (
              <div className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full text-xs font-semibold text-indigo-300">
                <Clock className="w-3.5 h-3.5" />
                <span>{sleepTimer}m</span>
              </div>
            )}
            <button
              onClick={() => setShowSleepTimerModal(true)}
              className="p-2 rounded-full hover:bg-white/5 transition text-zinc-400 hover:text-white"
              title="Sleep Timer"
            >
              <Moon className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Core Layout Split */}
        <main className="flex-1 min-h-0 flex flex-col md:flex-row p-6 md:p-12 overflow-hidden gap-8 md:gap-16 z-10 max-w-7xl mx-auto w-full items-center pointer-events-auto">
          
          {/* Left Panel: Cover Art & Controls */}
          <div className={`h-full max-h-full flex flex-col justify-between items-center max-w-md mx-auto w-full py-2 transition-all duration-300 ${activeTab !== 'player' ? 'hidden md:flex' : 'flex'}`}>
            
            {/* Artwork Container - Reverted back to original dimensions as requested */}
            <div 
              className={`h-[25vh] sm:h-[30vh] md:h-[32vh] lg:h-[36vh] xl:h-[40vh] ${isVideoMode ? 'aspect-video w-full max-w-lg bg-transparent' : 'aspect-square bg-zinc-900'} rounded-2xl border border-white/10 shadow-2xl relative group overflow-hidden mb-3 transition-all duration-700 hover:scale-[1.02] shrink cursor-pointer`}
              style={{ 
                boxShadow: `0 20px 50px -15px ${accentColor}40`,
              }}
              onClick={togglePlay}
            >
              {isVideoMode ? (
                <div className="relative w-full h-full bg-transparent">
                  <div 
                    id="youtube-player-placeholder"
                    className="w-full h-full rounded-2xl bg-transparent"
                  />
                  {/* Click Overlay to toggle play/pause and capture cursor events away from iframe branding */}
                  <div 
                    className="absolute inset-0 z-30 cursor-pointer"
                    onClick={togglePlay}
                  />
                </div>
              ) : (
                <img
                  src={
                    currentTrack.coverUrl && currentTrack.coverUrl.trim() !== '' && currentTrack.coverUrl !== 'null' && currentTrack.coverUrl !== 'undefined'
                      ? currentTrack.coverUrl
                      : (currentTrack.id && currentTrack.id.length === 11 ? `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg` : "/placeholder.png")
                  }
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null; // Prevent infinite loading loops
                    if (e.currentTarget.src !== `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg` && currentTrack.id && currentTrack.id.length === 11) {
                      e.currentTarget.src = `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg`;
                    } else {
                      e.currentTarget.src = "/placeholder.png";
                    }
                  }}
                />
              )}
            </div>

            {/* Song Metadata - shrink-0 protected with zero absolute margin (handled by flex justify-between) */}
            <div className="w-full text-center md:text-left flex items-center justify-between gap-4 shrink-0">
              <div className="overflow-hidden flex-1">
                <h2 className="text-xl md:text-2xl font-bold truncate tracking-tight">{currentTrack.title}</h2>
                <p className="text-sm md:text-md text-zinc-400 truncate mt-1">{currentTrack.artist}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {(isVideoMode || currentTrack.hasVideo) && (
                  <button
                    onClick={() => {
                      if (!isVideoMode) {
                        playTrack(currentTrack, undefined, true);
                      }
                      playVideo(currentTrack.id);
                    }}
                    className={`p-3 rounded-full hover:bg-white/5 transition ${
                      isVideoMode ? 'text-red-400 bg-red-500/10 animate-pulse' : 'text-zinc-400 hover:text-red-400'
                    }`}
                    title={isVideoMode ? "Watch Video" : "Watch Video"}
                  >
                    <Tv className="w-6 h-6" />
                  </button>
                )}
                <button
                  onClick={() => toggleLike(currentTrack)}
                  className="p-3 rounded-full hover:bg-white/5 transition"
                >
                  <Heart className={`w-6 h-6 ${isLiked(currentTrack.id) ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Scrub Slider - shrink-0 protected with zero absolute margin (handled by flex justify-between) */}
            <div className="w-full flex flex-col gap-2 shrink-0">
              <Slider
                value={currentTime}
                max={duration}
                onChange={(t) => seek(t)}
                accentColor={accentColor}
              />
              <div className="flex justify-between text-xs font-semibold text-zinc-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls - shrink-0 protected with zero absolute margin (handled by flex justify-between) */}
            <div className="w-full flex items-center justify-between px-2 shrink-0">
              <button
                onClick={toggleShuffle}
                className={`p-3 rounded-full hover:bg-white/5 transition ${isShuffle ? 'text-white font-bold' : 'text-zinc-500'}`}
                style={{ color: isShuffle ? accentColor : undefined }}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                onClick={previous}
                className="p-3 rounded-full hover:bg-white/5 text-zinc-300 hover:text-white transition"
              >
                <SkipBack className="w-7 h-7 fill-current" />
              </button>

              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full flex items-center justify-center text-zinc-950 transition hover:scale-105 active:scale-95 shadow-xl"
                style={{ backgroundColor: accentColor }}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-zinc-950 text-zinc-950" />
                ) : (
                  <Play className="w-7 h-7 fill-zinc-950 text-zinc-950 translate-x-0.5" />
                )}
              </button>

              <button
                onClick={next}
                className="p-3 rounded-full hover:bg-white/5 text-zinc-300 hover:text-white transition"
              >
                <SkipForward className="w-7 h-7 fill-current" />
              </button>

              <button
                onClick={toggleRepeat}
                className={`p-3 rounded-full hover:bg-white/5 transition ${repeatMode !== 'none' ? 'text-white' : 'text-zinc-500'}`}
                style={{ color: repeatMode !== 'none' ? accentColor : undefined }}
              >
                <Repeat className="w-5 h-5" />
              </button>
            </div>

          </div>

          {/* Right Panel: Sliding Lyrics or Queue content (Hidden on mobile when in Player mode) */}
          <div className={`flex-1 min-w-0 h-full overflow-hidden flex flex-col justify-center transition-all duration-300 pt-4 ${activeTab === 'player' ? 'hidden md:flex' : 'flex'}`}>
            
            {activeTab === 'queue' ? (
              <div className="h-full overflow-y-auto overscroll-contain pr-2 queue-scrollbar py-4 flex flex-col gap-2">
                <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Queue List</h3>
                
                 {activeQueue.map((track, idx) => {
                  const isCurrent = idx === currentIndex;
                  return (
                    <div
                      key={`${track.id}-${idx}`}
                      onClick={() => playTrack(track, activeQueue, isVideoMode)}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${isCurrent ? 'bg-white/10 border-white/10' : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'}`}
                    >
                      <span className="text-xs font-semibold text-zinc-500 w-4 text-right">
                        {idx + 1}
                      </span>
                      <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden shrink-0">
                        {track.coverUrl && (
                          <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-white' : 'text-zinc-300'}`} style={{ color: isCurrent ? accentColor : undefined }}>
                          {track.title}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
                      </div>
                    </div>
                  );
                 })}

                {activeQueue.length === 0 && (
                  <p className="text-zinc-500 text-center italic mt-12 text-sm">Queue is empty</p>
                )}
              </div>
            ) : (
              <LyricsPanel />
            )}

          </div>

        </main>

        {/* Compact bottom control bar for mobile when in lyrics or queue tab */}
        {activeTab !== 'player' && (
          <div className="md:hidden border-t border-white/5 bg-zinc-950/80 backdrop-blur-md p-4 flex items-center justify-between z-20 pointer-events-auto">
            <div className="flex items-center gap-3 overflow-hidden flex-1 mr-4">
              <img
                src={currentTrack.coverUrl || ''}
                alt=""
                className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
              />
              <div className="overflow-hidden">
                <p className="text-sm font-bold truncate text-white">{currentTrack.title}</p>
                <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={previous}
                className="p-2 text-zinc-400 hover:text-white transition"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-950 transition"
                style={{ backgroundColor: accentColor }}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-zinc-950 text-zinc-950" />
                ) : (
                  <Play className="w-4 h-4 fill-zinc-950 text-zinc-950 translate-x-0.5" />
                )}
              </button>
              <button
                onClick={next}
                className="p-2 text-zinc-400 hover:text-white transition"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>
        )}

      </motion.div>
    </AnimatePresence>
  );
}

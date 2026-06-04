'use client';

import React, { useEffect, useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { X, Maximize2, Minimize2, Tv } from 'lucide-react';

export function VideoPlayerModal() {
  const { activeVideoId, closeVideo, accentColor } = useUIStore();
  const { queue, shuffledQueue, isShuffle, currentIndex, togglePlay, showFullscreenPlayer } = usePlayerStore();

  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeQueue = isShuffle ? shuffledQueue : queue;
  const activePlaybackTrack = activeQueue[currentIndex];
  const videoId = activePlaybackTrack?.id || activeVideoId;

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeVideo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeVideo]);

  if (showFullscreenPlayer || !activeVideoId || !videoId) return null;

  return (
    <>
      {/* Background Overlay Backdrop (z-[58]) */}
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-md z-[58] animate-fade-in select-none"
        onClick={closeVideo}
      />
      
      {/* Decorative Blur Background Lights (z-[58]) */}
      <div 
        className="fixed top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-[100px] pointer-events-none transition duration-1000 z-[58]"
        style={{ backgroundColor: accentColor }}
      />
      <div 
        className="fixed bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-20 blur-[100px] pointer-events-none transition duration-1000 z-[58]"
        style={{ backgroundColor: accentColor }}
      />

      {/* Main Content Flex Overlay (z-[60]) */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none select-none animate-fade-in">
        {/* Main Glassmorphic Container */}
        <div 
          className={`relative w-full bg-transparent border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 max-h-[85vh] aspect-video pointer-events-auto
            ${isFullscreen ? 'max-w-7xl' : 'max-w-4xl'}`}
        >
          
          {/* Widescreen Video Player Anchor Placeholder (transparent) */}
          <div className="flex-1 w-full h-full bg-transparent relative">
            <div 
              id="youtube-player-placeholder" 
              className="w-full h-full rounded-2xl overflow-hidden bg-transparent" 
            />
            {/* Click Overlay to toggle play/pause and capture cursor events away from iframe branding */}
            <div 
              className="absolute inset-0 z-30 cursor-pointer"
              onClick={togglePlay}
            />
          </div>

          {/* Video Actions Header */}
          <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-[110] pointer-events-none">
            
            {/* Logo Brand */}
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md py-1 px-3 rounded-full border border-white/5 shadow-lg select-none animate-fade-in">
              <Tv className="w-4 h-4 text-red-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Stream Active</span>
            </div>

            {/* Widescreen Actions */}
            <div className="flex items-center gap-2 pointer-events-auto">
              
              {/* Aspect Size Toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white transition shadow-lg hover:scale-105"
                title={isFullscreen ? "Exit Widescreen" : "Widescreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                onClick={closeVideo}
                className="p-2 rounded-full bg-black/60 hover:bg-red-500/20 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-red-400 transition shadow-lg hover:scale-105"
                title="Close Player"
              >
                <X className="w-4 h-4" />
              </button>

            </div>

          </div>

        </div>
      </div>
    </>
  );
}

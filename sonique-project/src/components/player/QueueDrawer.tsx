'use client';

import React from 'react';
import { usePlayerStore, PlayerTrack } from '../../store/usePlayerStore';
import { useUIStore } from '../../store/useUIStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Sparkles, Music } from 'lucide-react';

export function QueueDrawer() {
  const {
    queue,
    shuffledQueue,
    isShuffle,
    currentIndex,
    isPlaying,
    showQueueList,
    setShowQueueList,
    playTrack,
    clearQueue,
    togglePlay,
    isVideoMode,
    showFullscreenPlayer
  } = usePlayerStore();

  const { accentColor, activeVideoId } = useUIStore();

  const activeQueue = isShuffle ? shuffledQueue : queue;
  const currentTrack = activeQueue[currentIndex];

  if (!showQueueList || showFullscreenPlayer || activeVideoId !== null) return null;

  const handleTrackClick = (track: PlayerTrack, idx: number) => {
    // Jump to the clicked track in the current queue list, preserving video mode context
    playTrack(track, activeQueue, isVideoMode);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-16 right-0 h-[calc(100vh-9rem)] w-80 md:w-96 bg-zinc-950/90 border-l border-white/5 backdrop-blur-xl shadow-2xl flex flex-col z-30 pt-0 select-none overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Queue</h3>
            {queue.length > 1 && (
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-zinc-400 font-semibold">
                {queue.length} songs
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="p-1.5 rounded-full hover:bg-white/5 text-zinc-400 hover:text-red-400 transition"
                title="Clear Queue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowQueueList(false)}
              className="p-1.5 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Queue List Content */}
        <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain px-4 py-4 queue-scrollbar flex flex-col gap-1.5">
          {activeQueue.map((track, idx) => {
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={`${track.id}-${idx}`}
                onClick={() => handleTrackClick(track, idx)}
                className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition group
                  ${isCurrent 
                    ? 'bg-white/10 border-white/10' 
                    : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
                  }`}
              >
                {/* Number / Playing Indicator */}
                <div className="w-5 text-center flex items-center justify-center shrink-0">
                  {isCurrent && isPlaying ? (
                    <span className="flex items-end gap-0.5 h-3">
                      <span className="w-0.5 bg-current animate-bounce-custom" style={{ animationDelay: '0.1s', backgroundColor: accentColor }} />
                      <span className="w-0.5 bg-current animate-bounce-custom" style={{ animationDelay: '0.3s', backgroundColor: accentColor }} />
                      <span className="w-0.5 bg-current animate-bounce-custom" style={{ animationDelay: '0.5s', backgroundColor: accentColor }} />
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-zinc-500 group-hover:text-white transition">
                      {idx + 1}
                    </span>
                  )}
                </div>

                {/* Cover Art */}
                <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden shrink-0 border border-white/5">
                  <img 
                    src={
                      track.coverUrl && track.coverUrl.trim() !== '' && track.coverUrl !== 'null' && track.coverUrl !== 'undefined'
                        ? track.coverUrl
                        : (track.id && track.id.length === 11 ? `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg` : "/placeholder.png")
                    } 
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

                {/* Details */}
                <div className="overflow-hidden flex-1 text-left">
                  <p 
                    className={`text-xs font-bold truncate leading-tight transition ${isCurrent ? '' : 'text-zinc-200'}`}
                    style={{ color: isCurrent ? accentColor : undefined }}
                  >
                    {track.title}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">{track.artist}</p>
                </div>

                {/* Vibe Match Tag (optional, if match is high) */}
                {idx > 0 && idx <= 5 && !isShuffle && (
                  <div className="shrink-0 flex items-center gap-0.5 bg-zinc-900/60 border border-white/5 rounded px-1.5 py-0.5 text-[8px] text-emerald-400 font-bold">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Vibe</span>
                  </div>
                )}
              </div>
            );
          })}

          {activeQueue.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-center gap-2">
              <Music className="w-10 h-10 stroke-1 opacity-30 text-zinc-400" />
              <h4 className="text-zinc-300 text-xs font-semibold">Queue is Empty</h4>
              <p className="text-[10px] max-w-[180px]">Select any song to automatically generate a matching vibe queue.</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

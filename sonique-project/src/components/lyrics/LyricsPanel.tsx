'use client';

import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useUIStore } from '../../store/useUIStore';

export function LyricsPanel() {
  const { lyrics, currentLyricIndex, seek, isLyricsLoading } = usePlayerStore();
  const { accentColor } = useUIStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentLyricIndex]);

  if (isLyricsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-4" style={{ borderColor: `${accentColor} transparent transparent transparent` }} />
        <p className="text-sm">Fetching lyrics...</p>
      </div>
    );
  }

  if (lyrics.length === 0 || (lyrics.length === 1 && lyrics[0].text.includes('not available'))) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-center p-6 italic">
        No synchronized lyrics found for this song.
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scroll-smooth flex flex-col gap-6 py-[20vh] mask-gradient"
    >
      {lyrics.map((line, idx) => {
        const isActive = idx === currentLyricIndex;
        const isPast = idx < currentLyricIndex;

        return (
          <div
            key={idx}
            ref={isActive ? activeLineRef : null}
            onClick={() => seek(line.time)}
            className={`cursor-pointer transition-all duration-300 py-1.5 px-3 rounded-lg text-left select-none origin-left
              ${isActive 
                ? 'text-white text-xl md:text-2xl font-bold scale-[1.03] shadow-sm bg-white/5' 
                : isPast
                  ? 'text-zinc-400 text-md md:text-lg font-medium hover:text-white'
                  : 'text-zinc-600 text-md md:text-lg font-medium hover:text-white'
              }`}
            style={{ 
              color: isActive ? undefined : undefined,
              textShadow: isActive ? `0 0 10px ${accentColor}20` : 'none'
            }}
          >
            {line.text}
          </div>
        );
      })}
    </div>
  );
}

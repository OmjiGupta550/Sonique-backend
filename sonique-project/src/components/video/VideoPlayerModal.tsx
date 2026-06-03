'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { X, Maximize2, Minimize2, Tv } from 'lucide-react';
import { API_BASE } from '../../lib/config';

export function VideoPlayerModal() {
  const { activeVideoId, closeVideo, accentColor } = useUIStore();
  const { 
    queue, 
    shuffledQueue, 
    isShuffle, 
    currentIndex, 
    isPlaying, 
    volume, 
    isMuted, 
    currentTime, 
    next 
  } = usePlayerStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startOffsetRef = useRef(0);

  const activeQueue = isShuffle ? shuffledQueue : queue;
  const activePlaybackTrack = activeQueue[currentIndex];
  
  // Bind to active track ID if present, otherwise fallback to the triggered video ID
  const videoId = activePlaybackTrack?.id || activeVideoId;

  // Resolve direct streaming URL from Flask to avoid browser media redirect seek bugs
  useEffect(() => {
    if (!videoId) return;
    
    setStreamUrl(null); // Reset on videoId change
    
    // Set startOffset to current playback time so the stream starts exactly where we are!
    const initialTime = usePlayerStore.getState().currentTime;
    startOffsetRef.current = initialTime;
    const startParam = Math.floor(initialTime) > 0 ? `?start=${Math.floor(initialTime)}` : '';
    
    fetch(`${API_BASE}/stream/video/${videoId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        if (data.stream_url) {
          const finalUrl = startParam ? `${data.stream_url}${data.stream_url.includes('?') ? '&' : '?'}${startParam.replace('?', '')}` : data.stream_url;
          setStreamUrl(finalUrl);
        }
      })
      .catch((err) => {
        console.error('Failed to resolve video stream:', err);
        // Fallback: use redirect URL directly if JSON call fails
        setStreamUrl(`${API_BASE}/stream/video/${videoId}?redirect=true${startParam ? '&' + startParam.replace('?', '') : ''}`);
      });
  }, [videoId]);

  // Sync play/pause changes from player controls
  useEffect(() => {
    if (!videoRef.current || videoRef.current.readyState < 1) return;
    const video = videoRef.current;
    if (isPlaying) {
      video.play().catch((err) => {
        console.warn('Playback failed or interrupted:', err);
      });
    } else {
      video.pause();
    }
  }, [isPlaying, videoId, streamUrl]);

  // Sync volume and mute changes from controls
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
    videoRef.current.muted = isMuted;
  }, [volume, isMuted, streamUrl]);

  // Sync manual seeks from progress bar slider (only seek when metadata is loaded!)
  useEffect(() => {
    if (!videoRef.current || videoRef.current.readyState < 1) return;
    const video = videoRef.current;
    const trueVideoTime = video.currentTime + startOffsetRef.current;
    if (Math.abs(trueVideoTime - currentTime) > 1.5) {
      startOffsetRef.current = currentTime;
      const baseUrl = `${API_BASE}/stream/video/hd/${videoId}`;
      setStreamUrl(`${baseUrl}?start=${Math.floor(currentTime)}`);
      video.load();
    }
  }, [currentTime, videoId]);

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

  if (!activeVideoId || !videoId) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in select-none">
      
      {/* Decorative Blur Background Lights */}
      <div 
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-[100px] pointer-events-none transition duration-1000"
        style={{ backgroundColor: accentColor }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-20 blur-[100px] pointer-events-none transition duration-1000"
        style={{ backgroundColor: accentColor }}
      />

      {/* Main Glassmorphic Container */}
      <div 
        className={`relative w-full bg-zinc-950/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300
          ${isFullscreen ? 'max-w-7xl aspect-video h-[90vh]' : 'max-w-4xl aspect-video'}`}
      >
        
        {/* Widescreen Video Player */}
        <div className="flex-1 w-full h-full bg-black relative">
          {streamUrl && (
            <video
              ref={videoRef}
              src={streamUrl}
              className="w-full h-full object-contain border-0 absolute inset-0 z-10"
              playsInline
              autoPlay={isPlaying}
              muted={isMuted}
              controls={false}
              onLoadedMetadata={(e) => {
                // Video starts playing from the startOffset naturally
              }}
              onSeeked={(e) => {
                const video = e.currentTarget;
                if (isPlaying) {
                  video.play().catch(console.error);
                }
              }}
              onTimeUpdate={(e) => {
                const video = e.currentTarget;
                usePlayerStore.setState({ currentTime: video.currentTime + startOffsetRef.current });
              }}
              onDurationChange={(e) => {
                // Retain track duration from store to avoid range-based stream duration issues
              }}
              onEnded={() => {
                next();
              }}
            />
          )}

          {/* Fallback Loading Skeleton */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-500 bg-zinc-950 z-0">
            <Tv className="w-12 h-12 stroke-1 text-zinc-700 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider text-zinc-600 animate-pulse uppercase">Buffering Video stream...</span>
          </div>
        </div>

        {/* Video Actions Header */}
        <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-20 pointer-events-none">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md py-1 px-3 rounded-full border border-white/5 shadow-lg select-none">
            <Tv className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Stream Active</span>
          </div>

          {/* Widescreen Actions */}
          <div className="flex items-center gap-2 pointer-events-auto">
            
            {/* Aspect Size Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white transition shadow-lg hover:scale-105"
              title={isFullscreen ? "Exit Wide View" : "Wide View"}
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
  );
}


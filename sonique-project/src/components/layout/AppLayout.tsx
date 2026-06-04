'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '../sidebar/Sidebar';
import { Header } from './Header';
import { MiniPlayer } from '../player/MiniPlayer';
import { FullscreenPlayer } from '../player/FullscreenPlayer';
import { QueueDrawer } from '../player/QueueDrawer';
import { CreatePlaylistModal, SleepTimerModal } from '../ui/Modals';
import { VideoPlayerModal } from '../video/VideoPlayerModal';
import { useUIStore } from '../../store/useUIStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useKeyboard } from '../../hooks/useKeyboard';
import { supabase } from '../../lib/supabase';
import { Music, Disc, Play, Pause, Maximize2 } from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { loadUserData, setProfile, isLoadingData, accentColor, activeVideoId, playVideo } = useUIStore();
  const { sleepTimerActive, decrementSleepTimer, initAudio, showFullscreenPlayer, setShowFullscreenPlayer, togglePlay, isPlaying, queue, shuffledQueue, isShuffle, currentIndex } = usePlayerStore();
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  // Initialize keyboard shortcuts
  useKeyboard();

  // Listen to Auth changes & initial load
  useEffect(() => {
    // Set profile if authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserData();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        loadUserData();
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserData, setProfile]);

  // Handle Sleep Timer decrement loop
  useEffect(() => {
    if (!sleepTimerActive) return;

    const timer = setInterval(() => {
      decrementSleepTimer();
    }, 60000); // 1 minute interval

    return () => clearInterval(timer);
  }, [sleepTimerActive, decrementSleepTimer]);

  // Register or Unregister PWA Service Worker depending on environment
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isDev) {
        // Unregister service worker in development to prevent caching Next.js dev bundles
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
            registration.unregister();
            console.log('Dev Mode: Service Worker Unregistered successfully.');
          }
        });
        // Clear caches in development to delete stale Turbopack dev chunks
        if ('caches' in window) {
          caches.keys().then((names) => {
            for (let name of names) {
              caches.delete(name);
            }
            console.log('Dev Mode: Cache Storage Cleared successfully.');
          });
        }
      } else {
        // Register in production
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('Service Worker Registered. Scope:', reg.scope))
          .catch((err) => console.error('Service Worker registration failed:', err));
      }
    }
  }, []);

  // Anchor-based YouTube Player Iframe positioning engine
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let active = true;

    const syncPlayerPosition = () => {
      if (!active) return;

      const container = document.getElementById("hidden-youtube-player-container");
      if (!container) {
        requestAnimationFrame(syncPlayerPosition);
        return;
      }

      // Check if a placeholder is currently rendered and visible on screen
      const placeholder = document.getElementById("youtube-player-placeholder");
      if (placeholder) {
        const rect = placeholder.getBoundingClientRect();
        
        // Match the placeholder's screen position and size
        container.style.width = `${rect.width}px`;
        container.style.height = `${rect.height}px`;
        container.style.top = `${rect.top}px`;
        container.style.left = `${rect.left}px`;
        container.style.bottom = '';
        container.style.right = '';
        container.style.opacity = "1";
        container.style.pointerEvents = "none";
        
        // Set to z-48 when overlays are active (above z-45 backgrounds, under z-50 panels)
        // Set to z-59 when overlays are active (above z-58 backgrounds, under z-60 panels)
        // Set to z-100 when minimized (shows on top of mini-player z-40 bar)
        const isOverlayActive = activeVideoId !== null || showFullscreenPlayer;
        container.style.zIndex = isOverlayActive ? "59" : "100";
        
        // Inherit border radius from placeholder if possible
        const style = window.getComputedStyle(placeholder);
        container.style.borderRadius = style.borderRadius || "8px";

        // Throttled debug log (once per second)
        if (typeof window !== "undefined") {
          (window as any).syncLogCounter = ((window as any).syncLogCounter || 0) + 1;
          if ((window as any).syncLogCounter % 60 === 0) {
            console.log("[Sync Debug] Placeholder rect:", {
              width: rect.width,
              height: rect.height,
              top: rect.top,
              left: rect.left
            }, "Container style:", {
              width: container.style.width,
              height: container.style.height,
              top: container.style.top,
              left: container.style.left,
              zIndex: container.style.zIndex,
              opacity: container.style.opacity,
              pointerEvents: container.style.pointerEvents
            });
          }
        }

        // Save rect for the root-level hover overlay when in mini player mode
        if (!isOverlayActive) {
          setHoverRect(rect);
        } else {
          setHoverRect(null);
        }
      } else {
        // Place off-screen and hide
        container.style.width = "200px";
        container.style.height = "200px";
        container.style.top = "-1000px";
        container.style.left = "-1000px";
        container.style.bottom = "";
        container.style.right = "";
        container.style.opacity = "0";
        container.style.pointerEvents = "none";
        container.style.zIndex = "-9999";
        container.style.borderRadius = "8px";
        setHoverRect(null);
      }

      requestAnimationFrame(syncPlayerPosition);
    };

    requestAnimationFrame(syncPlayerPosition);

    return () => {
      active = false;
    };
  }, [activeVideoId, showFullscreenPlayer]);

  // Trigger global document click to initialize HTMLAudioElement on first user interaction
  useEffect(() => {
    const handleFirstClick = () => {
      initAudio();
      document.removeEventListener('click', handleFirstClick);
    };
    document.addEventListener('click', handleFirstClick);
    return () => document.removeEventListener('click', handleFirstClick);
  }, [initAudio]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 font-sans antialiased text-zinc-200">
      
      {/* Background radial highlight */}
      <div 
        className="absolute top-0 right-0 w-[40vw] h-[40vw] opacity-10 rounded-full blur-[100px] pointer-events-none select-none transition-all duration-1000"
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, rgba(9, 9, 11, 0) 70%)`
        }}
      />

      {/* Spotify-style Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative pb-20">
        <Header />
        
        {/* Scrollable Body Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 scrollbar-thin scrollbar-thumb-zinc-800">
          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <Disc className="w-8 h-8 animate-spin-slow mb-4" style={{ color: accentColor }} />
              <p className="text-sm font-medium">Syncing database data...</p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Player Components */}
      <MiniPlayer />
      <FullscreenPlayer />
      <QueueDrawer />

      {/* Modals Container */}
      <CreatePlaylistModal />
      <SleepTimerModal />
      <VideoPlayerModal />

      {/* Root-Level MiniPlayer Hover Overlay for the Video Corner Preview */}
      {hoverRect && activeVideoId === null && !showFullscreenPlayer && (
        <div 
          className="fixed z-[105] bg-transparent opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer rounded-lg group pointer-events-auto"
          style={{
            width: `${hoverRect.width}px`,
            height: `${hoverRect.height}px`,
            top: `${hoverRect.top}px`,
            left: `${hoverRect.left}px`,
          }}
          onClick={togglePlay}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white drop-shadow-md" />
          ) : (
            <Play className="w-6 h-6 text-white translate-x-0.5 drop-shadow-md" />
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowFullscreenPlayer(true);
            }}
            className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-black text-white/80 hover:text-white transition opacity-0 group-hover:opacity-100"
            title="Open Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

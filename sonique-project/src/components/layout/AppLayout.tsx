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
      const hostname = window.location.hostname;
      const isDev = process.env.NODE_ENV === 'development' || 
                    hostname === 'localhost' || 
                    hostname === '127.0.0.1' ||
                    hostname.startsWith('192.168.') ||
                    hostname.startsWith('10.') ||
                    hostname.startsWith('172.') ||
                    hostname.endsWith('.local');
      
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
        
        // Always set to z-59 so the video player frame is sandwiched between z-58 backgrounds and z-60 controls layout
        container.style.zIndex = "59";
        
        // Inherit border radius from placeholder if possible
        const style = window.getComputedStyle(placeholder);
        container.style.borderRadius = style.borderRadius || "8px";

        // Bypass browser cross-origin minimum size (200x200px) rendering constraint by scaling the iframe inside the container viewport
        const iframe = container.querySelector("iframe") || container.firstElementChild as HTMLElement;
        if (iframe) {
          if (rect.width < 200 || rect.height < 200) {
            // Apply scale-down matrix to bypass minimum 200x200px rendering constraint
            const baseSize = 200;
            const scale = rect.width / baseSize;
            const scaledHeight = baseSize * scale;
            const offsetTop = -((scaledHeight - rect.height) / 2);

            iframe.style.setProperty("width", `${baseSize}px`, "important");
            iframe.style.setProperty("height", `${baseSize}px`, "important");
            iframe.style.setProperty("transform", `scale(${scale})`, "important");
            iframe.style.setProperty("transform-origin", "top left", "important");
            iframe.style.setProperty("margin-top", `${offsetTop}px`, "important");
            iframe.style.setProperty("margin-left", "0px", "important");
          } else {
            // Restore standard fullscreen / modal size
            iframe.style.setProperty("width", "100%", "important");
            iframe.style.setProperty("height", "100%", "important");
            iframe.style.setProperty("transform", "none", "important");
            iframe.style.setProperty("transform-origin", "top left", "important");
            iframe.style.setProperty("margin-top", "0px", "important");
            iframe.style.setProperty("margin-left", "0px", "important");
          }
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

        const iframe = container.querySelector("iframe") || container.firstElementChild as HTMLElement;
        if (iframe) {
          iframe.style.setProperty("width", "100%", "important");
          iframe.style.setProperty("height", "100%", "important");
          iframe.style.setProperty("transform", "none", "important");
          iframe.style.setProperty("margin-top", "0px", "important");
          iframe.style.setProperty("margin-left", "0px", "important");
        }
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

      {/* Persistent YouTube Player Container to prevent Stacking Context Sandwich bugs */}
      <div 
        id="hidden-youtube-player-container"
        style={{
          position: "fixed",
          width: "200px",
          height: "200px",
          top: "-1000px",
          left: "-1000px",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -9999,
          borderRadius: "8px",
          overflow: "hidden",
          transition: "opacity 0.3s ease, transform 0.3s ease",
          backgroundColor: "transparent"
        }}
      >
        <div id="hidden-youtube-player-iframe" style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}

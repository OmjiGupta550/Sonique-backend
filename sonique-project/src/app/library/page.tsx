'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { usePlayerStore, PlayerTrack } from '../../store/usePlayerStore';
import { TrackRow } from '../../components/track/TrackRow';
import { Heart, Disc, History, Download, User, Sliders, Palette } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type TabType = 'likes' | 'playlists' | 'history' | 'downloads' | 'profile';

function LibraryPageContent() {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab') as TabType;

  const [activeTab, setActiveTab] = useState<TabType>(urlTab || 'likes');
  const { likedTracks, playlists, profile, accentColor, setAccentColor, logout } = useUIStore();
  const { playPlaylist } = usePlayerStore();
  
  const [historyTracks, setHistoryTracks] = useState<PlayerTrack[]>([]);
  const [downloadedTracks, setDownloadedTracks] = useState<PlayerTrack[]>([]);

  // Sync tab state with URL parameter if updated
  useEffect(() => {
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Load localStorage history
  const loadHistory = () => {
    if (typeof window !== 'undefined') {
      const historyList = JSON.parse(localStorage.getItem('sonique_history') || '[]');
      setHistoryTracks(historyList);
    }
  };

  // Load downloads metadata list
  const loadDownloads = () => {
    if (typeof window !== 'undefined') {
      const dlList = JSON.parse(localStorage.getItem('sonique_downloads') || '[]');
      setDownloadedTracks(dlList);
    }
  };

  useEffect(() => {
    loadHistory();
    loadDownloads();

    // Listen for storage change events
    window.addEventListener('sonique_history_changed', loadHistory);
    window.addEventListener('sonique_likes_changed', loadHistory);
    return () => {
      window.removeEventListener('sonique_history_changed', loadHistory);
      window.removeEventListener('sonique_likes_changed', loadHistory);
    };
  }, []);

  const convertLikeToPlayerTrack = (like: any): PlayerTrack => ({
    id: like.track_id || like.id,
    title: like.title,
    artist: like.artist,
    coverUrl: like.cover_url || like.coverUrl || null,
    duration: like.duration,
    sourceUrl: like.source_url || like.sourceUrl
  });

  const handlePlayAllLikes = () => {
    const list = likedTracks.map(convertLikeToPlayerTrack);
    playPlaylist(list, 0);
  };

  const handleDownloadTrack = async (track: PlayerTrack) => {
    if (typeof window === 'undefined' || !('caches' in window)) return;
    
    try {
      const cache = await caches.open('sonique-audio-cache');
      
      // Fetch stream details
      const response = await fetch(track.sourceUrl);
      if (response.ok) {
        await cache.put(track.sourceUrl, response);
        
        // Save metadata list
        const dlList = JSON.parse(localStorage.getItem('sonique_downloads') || '[]');
        if (!dlList.some((d: any) => d.id === track.id)) {
          const updated = [track, ...dlList];
          localStorage.setItem('sonique_downloads', JSON.stringify(updated));
          setDownloadedTracks(updated);
        }
        alert('Downloaded song for offline playback!');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to cache stream');
    }
  };

  const colors = [
    '#8B5CF6', // Violet
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#EF4444', // Red
  ];

  return (
    <div className="space-y-6 pb-8 select-none">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Your Library</h1>

      {/* Navigation Subtabs */}
      <div className="flex gap-2 border-b border-white/5 pb-2 text-sm font-semibold overflow-x-auto scrollbar-none">
        {[
          { id: 'likes', label: 'Liked Songs', icon: Heart },
          { id: 'playlists', label: 'Playlists', icon: Disc },
          { id: 'history', label: 'History', icon: History },
          { id: 'downloads', label: 'Downloaded', icon: Download },
          { id: 'profile', label: 'Profile', icon: User }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-3 py-2 rounded-lg transition shrink-0 flex items-center gap-1.5 border
                ${activeTab === tab.id 
                  ? 'text-zinc-950 border-white' 
                  : 'text-zinc-400 border-transparent hover:text-white hover:bg-white/5'
                }`}
              style={{ backgroundColor: activeTab === tab.id ? accentColor : 'transparent' }}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {/* TAB: LIKES */}
        {activeTab === 'likes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                {likedTracks.length} Saved Songs
              </p>
              {likedTracks.length > 0 && (
                <button
                  onClick={handlePlayAllLikes}
                  className="text-xs font-bold py-1.5 px-4 rounded-full text-zinc-950"
                  style={{ backgroundColor: accentColor }}
                >
                  Play All
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {likedTracks.map((like, idx) => {
                const track = convertLikeToPlayerTrack(like);
                return (
                  <div key={like.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <TrackRow track={track} index={idx} />
                    </div>
                    <button
                      onClick={() => handleDownloadTrack(track)}
                      className="p-2 text-zinc-500 hover:text-white transition rounded-full hover:bg-white/5 shrink-0"
                      title="Download Song"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              {likedTracks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-center gap-2">
                  <Heart className="w-12 h-12 stroke-1 opacity-40 text-rose-500" />
                  <h4 className="text-zinc-300 font-semibold">No Liked Songs</h4>
                  <p className="text-xs max-w-xs">Tracks you tap the heart on will show up here. Works offline or online.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: PLAYLISTS */}
        {activeTab === 'playlists' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {playlists.map((pl) => (
                <Link
                  key={pl.id}
                  href={`/playlist/${pl.id}`}
                  className="bg-zinc-900/40 border border-white/5 hover:border-white/10 hover:bg-zinc-800/40 p-4 rounded-xl flex flex-col gap-3 transition"
                >
                  <div className="aspect-square w-full rounded bg-zinc-800 flex items-center justify-center">
                    <Disc className="w-12 h-12 text-zinc-600 animate-spin-slow" />
                  </div>
                  <div className="overflow-hidden w-full text-left">
                    <p className="font-semibold text-sm truncate text-white">{pl.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{pl.description || 'Custom playlist'}</p>
                  </div>
                </Link>
              ))}
            </div>

            {playlists.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-center gap-2">
                <Disc className="w-12 h-12 stroke-1 opacity-40 text-indigo-400" />
                <h4 className="text-zinc-300 font-semibold">No Created Playlists</h4>
                <p className="text-xs max-w-xs">Create custom playlists via the sidebar to organize your favorite hits.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              {historyTracks.map((track, idx) => (
                <TrackRow key={`${track.id}-${idx}`} track={track} index={idx} />
              ))}

              {historyTracks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-center gap-2">
                  <History className="w-12 h-12 stroke-1 opacity-40 text-blue-400" />
                  <h4 className="text-zinc-300 font-semibold">History Empty</h4>
                  <p className="text-xs max-w-xs">Your played music items will populate here as you browse.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: DOWNLOADS */}
        {activeTab === 'downloads' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              {downloadedTracks.map((track, idx) => (
                <TrackRow key={track.id} track={track} index={idx} />
              ))}

              {downloadedTracks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-center gap-2">
                  <Download className="w-12 h-12 stroke-1 opacity-40 text-emerald-400" />
                  <h4 className="text-zinc-300 font-semibold">No Downloads Available</h4>
                  <p className="text-xs max-w-xs">Tap the download icon next to your Liked Songs to cache them for offline listening.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: PROFILE & SYSTEM ACCENT COLORS */}
        {activeTab === 'profile' && (
          <div className="max-w-xl mx-auto space-y-6">
            
            {profile ? (
              <section className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-6">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-zinc-950"
                  style={{ backgroundColor: accentColor }}
                >
                  {profile.email[0].toUpperCase()}
                </div>
                <div className="text-center sm:text-left flex-1 space-y-1">
                  <h3 className="text-lg font-bold text-white">{profile.display_name || 'Sonique User'}</h3>
                  <p className="text-xs text-zinc-400">{profile.email}</p>
                  <p className="text-[10px] text-zinc-500">Joined Sonique: {new Date(profile.created_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={logout}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold py-1.5 px-4 rounded-lg text-red-400 transition"
                >
                  Log Out
                </button>
              </section>
            ) : (
              <section className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl text-center space-y-4">
                <User className="w-12 h-12 mx-auto stroke-1 text-zinc-400" />
                <div>
                  <h3 className="font-bold text-white">Not Signed In</h3>
                  <p className="text-xs text-zinc-400 mt-1">Sign in with Supabase auth to sync playlists and likes across devices.</p>
                </div>
                <Link
                  href="/login"
                  className="inline-block text-xs font-semibold px-6 py-2 rounded-full text-zinc-950 hover:scale-105 active:scale-95 transition"
                  style={{ backgroundColor: accentColor }}
                >
                  Sign In Now
                </Link>
              </section>
            )}

            {/* Customization Accent Settings */}
            <section className="bg-zinc-900/40 border border-white/5 p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">Customize Accent Theme</h4>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Choose a custom theme color accent. Keep in mind that active tracks automatically colorize the screen dynamically based on their artwork!
              </p>
              
              <div className="flex gap-3">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAccentColor(c)}
                    className="w-8 h-8 rounded-full border-2 transition duration-200 hover:scale-110"
                    style={{ 
                      backgroundColor: c,
                      borderColor: accentColor === c ? 'white' : 'transparent'
                    }}
                  />
                ))}
              </div>
            </section>

          </div>
        )}
      </div>

    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium">Loading Library...</p>
      </div>
    }>
      <LibraryPageContent />
    </Suspense>
  );
}

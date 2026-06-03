'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Library, Plus, Disc, Heart, Moon, LogIn, User } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export function Sidebar() {
  const pathname = usePathname();
  const { playlists, profile, setShowCreatePlaylistModal, setShowSleepTimerModal, accentColor } = useUIStore();

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Search', href: '/search', icon: Search },
    { label: 'Library', href: '/library', icon: Library },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-full bg-zinc-950/60 border-r border-white/5 p-4 shrink-0 backdrop-blur-xl">
      {/* App Logo */}
      <div className="flex items-center gap-3 px-2 mb-6">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: accentColor }}
        >
          <Disc className="w-5 h-5 animate-spin-slow" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white bg-clip-text bg-gradient-to-r from-white to-zinc-400">
          Sonique
        </span>
      </div>

      {/* Main Navigation */}
      <nav className="flex flex-col gap-1 mb-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'text-white bg-white/5 shadow-md border-l-2' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              style={{ borderLeftColor: isActive ? accentColor : 'transparent' }}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Playlists & Actions Header */}
      <div className="flex items-center justify-between px-2 mb-3">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Playlists</span>
        {profile && (
          <button
            onClick={() => setShowCreatePlaylistModal(true)}
            className="text-zinc-400 hover:text-white transition"
            title="Create Playlist"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Playlist Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 pr-1 space-y-1 mb-4">
        <Link
          href="/library?tab=likes"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white transition duration-200"
        >
          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white">
            <Heart className="w-3.5 h-3.5 fill-white" />
          </div>
          <span className="truncate font-medium">Liked Songs</span>
        </Link>

        {playlists.map((playlist) => (
          <Link
            key={playlist.id}
            href={`/playlist/${playlist.id}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white transition duration-200"
          >
            <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-zinc-400">
              <Disc className="w-3.5 h-3.5" />
            </div>
            <span className="truncate font-medium">{playlist.name}</span>
          </Link>
        ))}

        {playlists.length === 0 && profile && (
          <div className="px-3 py-4 text-xs text-zinc-500 italic text-center">
            No custom playlists. Click '+' to create.
          </div>
        )}

        {!profile && (
          <div className="px-3 py-4 text-xs text-zinc-500 italic text-center">
            Log in to manage playlists
          </div>
        )}
      </div>

      {/* Footer / Sleep Timer */}
      <div className="border-t border-white/5 pt-4 mt-auto">
        <button
          onClick={() => setShowSleepTimerModal(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition duration-200"
        >
          <Moon className="w-5 h-5 text-indigo-400" />
          <span>Sleep Timer</span>
        </button>
      </div>
    </aside>
  );
}

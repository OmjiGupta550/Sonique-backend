'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, User, LogOut, Disc, Menu } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import Link from 'next/link';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, logout, accentColor } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="h-16 bg-zinc-950/20 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-40 select-none">
      
      {/* Navigation Arrows */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-full bg-zinc-900/60 text-zinc-400 hover:text-white transition"
          title="Go Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => router.forward()}
          className="p-1.5 rounded-full bg-zinc-900/60 text-zinc-400 hover:text-white transition"
          title="Go Forward"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Center Search Input */}
      {pathname !== '/search' ? (
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md mx-6 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, albums..."
            className="w-full bg-zinc-900/60 border border-white/5 focus:border-zinc-700/60 rounded-full py-1.5 pl-10 pr-4 text-sm text-zinc-200 focus:outline-none focus:bg-zinc-900 transition duration-200"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-2.5" />
        </form>
      ) : (
        <div className="flex-1" />
      )}

      {/* Right User Auth Menu */}
      <div className="relative">
        {profile ? (
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-full bg-zinc-900/60 hover:bg-zinc-900 transition"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-7 h-7 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-zinc-950"
                style={{ backgroundColor: accentColor }}
              >
                {profile.email[0].toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-zinc-200 hidden sm:inline px-1">
              {profile.display_name || profile.email.split('@')[0]}
            </span>
          </button>
        ) : (
          <Link
            href="/login"
            className="text-xs font-semibold bg-white text-zinc-950 px-4 py-2 rounded-full hover:scale-105 active:scale-95 transition"
          >
            Log In
          </Link>
        )}

        {/* Dropdown Menu */}
        {showDropdown && profile && (
          <div className="absolute right-0 mt-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl py-1.5 w-48 z-50">
            <Link
              href="/library?tab=profile"
              onClick={() => setShowDropdown(false)}
              className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Link>
            <button
              onClick={() => {
                setShowDropdown(false);
                logout();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>

    </header>
  );
}

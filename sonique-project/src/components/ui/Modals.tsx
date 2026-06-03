'use client';

import React, { useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { X, Moon, FolderPlus, Clock } from 'lucide-react';

export function CreatePlaylistModal() {
  const { showCreatePlaylistModal, setShowCreatePlaylistModal, createPlaylist, accentColor } = useUIStore();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  if (!showCreatePlaylistModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const success = await createPlaylist(name, desc);
    setLoading(false);

    if (success) {
      setName('');
      setDesc('');
      setShowCreatePlaylistModal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-xl w-full max-w-md shadow-2xl relative text-white animate-fade-in">
        <button
          onClick={() => setShowCreatePlaylistModal(false)}
          className="absolute right-4 top-4 text-zinc-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <FolderPlus className="w-6 h-6" style={{ color: accentColor }} />
          <h3 className="text-lg font-bold">Create New Playlist</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Playlist Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My awesome playlist"
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Description (Optional)</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Give your playlist some context..."
              rows={3}
              className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold py-2.5 rounded-lg transition-transform active:scale-95 shadow-md flex items-center justify-center text-zinc-950"
            style={{ backgroundColor: accentColor }}
          >
            {loading ? 'Creating...' : 'Create Playlist'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function SleepTimerModal() {
  const { showSleepTimerModal, setShowSleepTimerModal, accentColor } = useUIStore();
  const { sleepTimer, sleepTimerActive, setSleepTimer } = usePlayerStore();

  if (!showSleepTimerModal) return null;

  const timerOptions = [5, 15, 30, 45, 60];

  const handleSelectOption = (minutes: number | null) => {
    setSleepTimer(minutes);
    setShowSleepTimerModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-xl w-full max-w-sm shadow-2xl relative text-white animate-fade-in">
        <button
          onClick={() => setShowSleepTimerModal(false)}
          className="absolute right-4 top-4 text-zinc-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <Moon className="w-6 h-6 text-indigo-400" />
          <h3 className="text-lg font-bold">Sleep Timer</h3>
        </div>

        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          Set a timer to automatically pause playback after the duration expires. Perfect for falling asleep.
        </p>

        {sleepTimerActive && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between mb-6">
            <span className="text-xs text-zinc-400 font-medium">Active sleep timer</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-indigo-300">{sleepTimer} minutes left</span>
              <button
                onClick={() => handleSelectOption(null)}
                className="text-xs font-semibold hover:text-red-400 transition"
              >
                Turn Off
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          {timerOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => handleSelectOption(opt)}
              className="bg-zinc-950 border border-white/5 hover:border-white/10 py-3 rounded-lg text-sm font-medium transition hover:bg-white/5 flex items-center justify-center gap-1.5"
            >
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>{opt} Minutes</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

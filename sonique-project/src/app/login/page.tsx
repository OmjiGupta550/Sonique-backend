'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useUIStore } from '../../store/useUIStore';
import { Disc, LogIn, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { accentColor, loadUserData } = useUIStore();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Signup
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: displayName || email.split('@')[0],
            }
          }
        });

        if (error) throw error;
        
        alert('Verification email sent! Check your inbox or continue.');
        setIsSignUp(false);
      } else {
        // Signin
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        // Sync store profile data
        await loadUserData();
        router.push('/library');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/library` : undefined
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Google Login failed.');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-10 select-none">
      <div className="bg-zinc-900 border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl relative text-white space-y-6">
        
        {/* App Branding */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg animate-pulse"
            style={{ backgroundColor: accentColor }}
          >
            <Disc className="w-7 h-7 animate-spin-slow" />
          </div>
          <h2 className="text-2xl font-black tracking-tight mt-2">
            {isSignUp ? 'Create your account' : 'Sign in to Sonique'}
          </h2>
          <p className="text-xs text-zinc-400">
            {isSignUp 
              ? 'Join millions streaming songs with real-time lyrics' 
              : 'Sync your playlists, likes and history across devices'
            }
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-950/40 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-lg text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Display Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                />
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              />
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              />
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-md flex items-center justify-center text-zinc-950"
            style={{ backgroundColor: accentColor }}
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Log In'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white/5 border border-white/10 hover:bg-white/10 font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm text-white"
        >
          {/* Simple custom Google logo representation */}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.535 0-6.4-2.865-6.4-6.4s2.865-6.4 6.4-6.4c1.782 0 3.3.733 4.4 1.914l3.1-3.1C18.6 1.9 15.6 1 12.2 1 6 1 1 6 1 12.2s5 11.2 11.2 11.2c6.2 0 10.8-4.4 10.8-10.8 0-.8-.1-1.3-.2-1.8z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Toggle Mode Footer */}
        <div className="text-center text-xs text-zinc-400 pt-2 border-t border-white/5">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
            }}
            className="font-bold underline hover:text-white transition"
            style={{ color: accentColor }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up for free'}
          </button>
        </div>

      </div>
    </div>
  );
}

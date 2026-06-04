'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useUIStore } from '../../store/useUIStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { 
  Shield, 
  Database,
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Play, 
  Pause, 
  Tv, 
  Volume2, 
  FileText, 
  CornerDownRight 
} from 'lucide-react';

interface DiagnosticResult {
  step: string;
  status: 'loading' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export default function DiagnosePage() {
  const { accentColor } = useUIStore();
  const { audio, initAudio, playTrack } = usePlayerStore();
  
  const [results, setResults] = useState<DiagnosticResult[]>([
    { step: 'Supabase Initialization', status: 'loading', message: 'Checking environment variables...' },
    { step: 'Authentication Session', status: 'loading', message: 'Checking current login session...' },
    { step: 'Profiles Table Access', status: 'loading', message: 'Checking user database profile...' },
    { step: 'Preferences Table Access', status: 'loading', message: 'Checking database preferences...' },
  ]);
  const [running, setRunning] = useState(false);

  // YouTube Diagnostic States
  const [ytStatus, setYtStatus] = useState<{
    scriptLoaded: boolean | 'loading';
    windowYtPresent: boolean | 'loading';
    playerReady: boolean | 'loading';
    audioInstanceExists: boolean | 'loading';
    playbackState: string;
  }>({
    scriptLoaded: 'loading',
    windowYtPresent: 'loading',
    playerReady: 'loading',
    audioInstanceExists: 'loading',
    playbackState: 'unstarted',
  });

  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [testVideoId, setTestVideoId] = useState('dQw4w9WgXcQ'); // Rickroll as default test video

  // Listen to youtube_player_log custom events
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load initial logs
      setLogs((window as any).youtubePlayerLogs || []);

      const handleLog = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        setLogs((prev) => [...prev, detail]);
      };

      window.addEventListener('youtube_player_log', handleLog);
      return () => {
        window.removeEventListener('youtube_player_log', handleLog);
      };
    }
  }, []);

  // Scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Run YouTube diagnostics
  const checkYouTubeState = () => {
    if (typeof window === 'undefined') return;

    const scriptPresent = !!document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const ytPresent = !!((window as any).YT && (window as any).YT.Player);
    
    // Check if player container is ready in DOM
    const container = document.getElementById('hidden-youtube-player-container');
    const iframe = document.getElementById('hidden-youtube-player-iframe');
    const isPlayerCreated = !!(container && iframe && (iframe.tagName === 'IFRAME' || iframe.hasChildNodes()));

    setYtStatus({
      scriptLoaded: scriptPresent,
      windowYtPresent: ytPresent,
      playerReady: isPlayerCreated,
      audioInstanceExists: !!audio,
      playbackState: audio ? (audio.paused ? 'paused' : 'playing') : 'not-initialized',
    });
  };

  // Run YouTube check on mount and interval
  useEffect(() => {
    checkYouTubeState();
    const interval = setInterval(checkYouTubeState, 2000);
    return () => clearInterval(interval);
  }, [audio]);

  const runDiagnostics = async () => {
    setRunning(true);
    const newResults: DiagnosticResult[] = [];

    // Step 1: Supabase Initialization
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const isPlaceholder = !url || url.includes('placeholder') || !key || key.includes('placeholder');

    if (isPlaceholder) {
      newResults.push({
        step: 'Supabase Initialization',
        status: 'error',
        message: 'Supabase is running in placeholder mode.',
        details: `URL: ${url || 'Not set'}. Please make sure .env.local has valid keys and the dev server was restarted.`
      });
    } else {
      newResults.push({
        step: 'Supabase Initialization',
        status: 'success',
        message: 'Supabase client initialized successfully with custom credentials.',
        details: `Connected to project URL: ${url}`
      });
    }

    // Step 2: Auth Session Check
    let currentUser: any = null;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      if (user) {
        currentUser = user;
        newResults.push({
          step: 'Authentication Session',
          status: 'success',
          message: 'Authenticated session is active!',
          details: `Logged in as: ${user.email} (ID: ${user.id})`
        });
      } else {
        newResults.push({
          step: 'Authentication Session',
          status: 'warning',
          message: 'No active session found in Supabase Auth.',
          details: 'Please go to /login and sign in or sign up first, then return to this diagnostics page.'
        });
      }
    } catch (e: any) {
      newResults.push({
        step: 'Authentication Session',
        status: 'error',
        message: 'Failed to fetch auth session.',
        details: e.message || String(e)
      });
    }

    // Step 3: Profiles Table Check
    if (currentUser) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (profileError) {
          newResults.push({
            step: 'Profiles Table Access',
            status: 'error',
            message: 'Error querying "profiles" table.',
            details: `Postgres Error Code: ${profileError.code}. Message: ${profileError.message}`
          });
        } else if (profile) {
          newResults.push({
            step: 'Profiles Table Access',
            status: 'success',
            message: 'Profile row found in database!',
            details: `Display Name: "${profile.display_name}", Email: "${profile.email}"`
          });
        } else {
          // Profile is missing - try inserting to check RLS permissions
          newResults.push({
            step: 'Profiles Table Access',
            status: 'warning',
            message: 'No profile row exists for this user in the database.',
            details: 'Attempting to self-heal by inserting a profile row...'
          });

          const newProfile = {
            id: currentUser.id,
            email: currentUser.email!,
            display_name: currentUser.user_metadata?.full_name || currentUser.email!.split('@')[0],
          };

          const { data: inserted, error: insertError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (insertError) {
            newResults.push({
              step: 'Profiles Table Insertion',
              status: 'error',
              message: 'Failed to insert profile row. RLS policies or trigger might be blocking.',
              details: `Postgres Error Code: ${insertError.code}. Message: ${insertError.message}. Make sure RLS insert policy exists or recreate user account.`
            });
          } else {
            newResults.push({
              step: 'Profiles Table Insertion',
              status: 'success',
              message: 'Successfully self-healed! Profile row created.',
              details: `Inserted Display Name: "${inserted.display_name}"`
            });
          }
        }
      } catch (e: any) {
        newResults.push({
          step: 'Profiles Table Access',
          status: 'error',
          message: 'Unhandled exception querying profiles.',
          details: e.message || String(e)
        });
      }
    } else {
      newResults.push({
        step: 'Profiles Table Access',
        status: 'warning',
        message: 'Skipped. Log in first to test profiles table access.',
      });
    }

    // Step 4: Preferences Check
    if (currentUser) {
      try {
        const { data: prefs, error: prefsError } = await supabase
          .from('preferences')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (prefsError) {
          newResults.push({
            step: 'Preferences Table Access',
            status: 'error',
            message: 'Error querying "preferences" table.',
            details: `Postgres Error: ${prefsError.message}`
          });
        } else if (prefs) {
          newResults.push({
            step: 'Preferences Table Access',
            status: 'success',
            message: 'Preferences row found in database!',
            details: `Accent Color: ${prefs.accent_color}, Theme: ${prefs.theme}`
          });
        } else {
          newResults.push({
            step: 'Preferences Table Access',
            status: 'warning',
            message: 'No preferences row exists for this user.',
            details: 'Attempting to insert default preferences...'
          });

          const newPrefs = {
            user_id: currentUser.id,
            theme: 'dark',
            volume_default: 0.8,
            accent_color: '#8B5CF6'
          };

          const { error: insertPrefsError } = await supabase
            .from('preferences')
            .insert(newPrefs);

          if (insertPrefsError) {
            newResults.push({
              step: 'Preferences Table Insertion',
              status: 'error',
              message: 'Failed to insert preferences row.',
              details: insertPrefsError.message
            });
          } else {
            newResults.push({
              step: 'Preferences Table Insertion',
              status: 'success',
              message: 'Successfully self-healed! Default preferences row created.',
            });
          }
        }
      } catch (e: any) {
        newResults.push({
          step: 'Preferences Table Access',
          status: 'error',
          message: 'Unhandled exception querying preferences.',
          details: e.message || String(e)
        });
      }
    } else {
      newResults.push({
        step: 'Preferences Table Access',
        status: 'warning',
        message: 'Skipped. Log in first to test preferences access.',
      });
    }

    setResults(newResults);
    setRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const triggerTestAudioInitialization = () => {
    initAudio();
    checkYouTubeState();
  };

  const playTestSong = () => {
    if (!testVideoId) return;
    
    // Create a mock player track
    const mockTrack = {
      id: testVideoId,
      title: 'Diagnostics Test Song',
      artist: 'YouTube Player API',
      coverUrl: `https://img.youtube.com/vi/${testVideoId}/0.jpg`,
      duration: 212,
      sourceUrl: `/api/stream/${testVideoId}?redirect=true`,
    };

    playTrack(mockTrack, [mockTrack], false);
  };

  const playTestVideo = () => {
    if (!testVideoId) return;

    const mockTrack = {
      id: testVideoId,
      title: 'Diagnostics Test Video',
      artist: 'YouTube Player API',
      coverUrl: `https://img.youtube.com/vi/${testVideoId}/0.jpg`,
      duration: 212,
      sourceUrl: `/api/stream/${testVideoId}?redirect=true`,
    };

    playTrack(mockTrack, [mockTrack], true);
  };

  const getStatusIcon = (status: boolean | 'loading') => {
    if (status === 'loading') {
      return <div className="w-4 h-4 rounded-full border border-t-transparent animate-spin border-zinc-400 shrink-0" />;
    }
    return status ? (
      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6 select-none pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8" style={{ color: accentColor }} />
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white">System Diagnostics</h1>
            <p className="text-xs text-zinc-400">Troubleshoot database connections and media streaming playback</p>
          </div>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={running}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-zinc-300 hover:text-white"
          title="Rerun database diagnostics"
        >
          <RefreshCw className={`w-5 h-5 ${running ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Supabase DB Panel */}
        <div className="space-y-4">
          <h2 className="text-md font-bold text-zinc-300 flex items-center gap-2">
            <Database className="w-4 h-4 text-zinc-400" /> Database & Session Checks
          </h2>
          <div className="space-y-3">
            {results.map((res, index) => (
              <div key={index} className="bg-zinc-900/30 border border-white/5 p-4 rounded-xl flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  {res.status === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                  {res.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                  {res.status === 'warning' && <AlertCircle className="w-5 h-5 text-amber-500" />}
                  {res.status === 'loading' && <div className="w-5 h-5 rounded-full border border-t-transparent animate-spin" style={{ borderColor: `${accentColor} transparent transparent transparent` }} />}
                </div>
                <div className="flex-1 space-y-1 overflow-hidden">
                  <h3 className="text-xs font-bold text-white">{res.step}</h3>
                  <p className="text-[11px] text-zinc-400 leading-normal">{res.message}</p>
                  {res.details && (
                    <pre className="text-[9px] text-zinc-400 font-mono bg-black/40 p-2 rounded-lg border border-white/5 overflow-x-auto leading-relaxed mt-2 select-all">
                      {res.details}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: YouTube Player Panel */}
        <div className="space-y-4">
          <h2 className="text-md font-bold text-zinc-300 flex items-center gap-2">
            <Tv className="w-4 h-4 text-zinc-400" /> YouTube Streaming Engine
          </h2>

          <div className="bg-zinc-900/30 border border-white/5 p-5 rounded-xl space-y-4">
            {/* Status Checklist */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 bg-black/20 border border-white/5 p-2 rounded-lg">
                {getStatusIcon(ytStatus.scriptLoaded)}
                <span className="text-zinc-300 text-[10px]">API Script Tag</span>
              </div>
              <div className="flex items-center gap-2 bg-black/20 border border-white/5 p-2 rounded-lg">
                {getStatusIcon(ytStatus.windowYtPresent)}
                <span className="text-zinc-300 text-[10px]">window.YT.Player</span>
              </div>
              <div className="flex items-center gap-2 bg-black/20 border border-white/5 p-2 rounded-lg">
                {getStatusIcon(ytStatus.playerReady)}
                <span className="text-zinc-300 text-[10px]">Iframe Node (DOM)</span>
              </div>
              <div className="flex items-center gap-2 bg-black/20 border border-white/5 p-2 rounded-lg">
                {getStatusIcon(ytStatus.audioInstanceExists)}
                <span className="text-zinc-300 text-[10px]">Store Audio Instance</span>
              </div>
            </div>

            {/* Test Actions */}
            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="YouTube Video ID (e.g. dQw4w9WgXcQ)"
                  value={testVideoId}
                  onChange={(e) => setTestVideoId(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none transition"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={triggerTestAudioInitialization}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-800 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5" /> Force Init Player
                </button>

                <button
                  onClick={playTestSong}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-600"
                >
                  <Play className="w-3.5 h-3.5" /> Play Audio Mode
                </button>

                <button
                  onClick={playTestVideo}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-600"
                >
                  <Tv className="w-3.5 h-3.5" /> Play Video Mode
                </button>
              </div>

              <div className="text-[10px] text-zinc-500 leading-normal flex items-start gap-1">
                <CornerDownRight className="w-3 h-3 text-zinc-600 shrink-0 mt-0.5" />
                <span>Note: To test correctly on desktop and mobile, click **Force Init Player** first to verify browser authorization.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logger Output Panel */}
      <div className="space-y-4">
        <h2 className="text-md font-bold text-zinc-300 flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-400" /> Live Streaming Engine Console Logs
        </h2>
        <div className="bg-black/60 border border-white/5 p-4 rounded-xl font-mono text-[10px] text-zinc-300 h-64 overflow-y-auto flex flex-col gap-1.5 leading-normal border-l-2 border-l-indigo-500/50 shadow-inner">
          {logs.length === 0 ? (
            <div className="text-zinc-600 italic h-full flex items-center justify-center">
              No logs recorded yet. Initialize the player or start playback to inspect traces...
            </div>
          ) : (
            logs.map((log, i) => (
              <div 
                key={i} 
                className={`py-0.5 border-b border-white/5 border-dashed last:border-b-0 ${
                  log.includes('Error') || log.includes('failed') ? 'text-red-400 bg-red-950/20' : 
                  log.includes('onReady') || log.includes('PLAYING') ? 'text-emerald-400' : 
                  log.includes('Setting src') || log.includes('Play requested') ? 'text-cyan-300' : 'text-zinc-300'
                }`}
              >
                {log}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useUIStore } from '../../store/useUIStore';
import { Shield, Database, User, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  step: string;
  status: 'loading' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export default function DiagnosePage() {
  const { accentColor } = useUIStore();
  const [results, setResults] = useState<DiagnosticResult[]>([
    { step: 'Supabase Initialization', status: 'loading', message: 'Checking environment variables...' },
    { step: 'Authentication Session', status: 'loading', message: 'Checking current login session...' },
    { step: 'Profiles Table Access', status: 'loading', message: 'Checking user database profile...' },
    { step: 'Preferences Table Access', status: 'loading', message: 'Checking database preferences...' },
  ]);
  const [running, setRunning] = useState(false);

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

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 select-none">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8" style={{ color: accentColor }} />
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white">System Diagnostics</h1>
            <p className="text-xs text-zinc-400">Troubleshoot auth connection, session state, and database tables</p>
          </div>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={running}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition text-zinc-300 hover:text-white"
          title="Rerun diagnostics"
        >
          <RefreshCw className={`w-5 h-5 ${running ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-4">
        {results.map((res, index) => (
          <div key={index} className="bg-zinc-900/40 border border-white/5 p-4 rounded-xl flex items-start gap-4">
            <div className="shrink-0 mt-0.5">
              {res.status === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
              {res.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
              {res.status === 'warning' && <AlertCircle className="w-5 h-5 text-amber-500" />}
              {res.status === 'loading' && <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${accentColor} transparent transparent transparent` }} />}
            </div>
            <div className="flex-1 space-y-1 overflow-hidden">
              <h3 className="text-sm font-bold text-white">{res.step}</h3>
              <p className="text-xs text-zinc-300">{res.message}</p>
              {res.details && (
                <pre className="text-[10px] text-zinc-400 font-mono bg-black/40 p-2.5 rounded-lg border border-white/5 overflow-x-auto leading-relaxed mt-2 select-all">
                  {res.details}
                </pre>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

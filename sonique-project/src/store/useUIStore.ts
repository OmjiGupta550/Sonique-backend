import { create } from 'zustand';
import { supabase, Profile, Playlist, Like } from '../lib/supabase';
import { trackLike, trackGenericAction } from '../lib/recommendations';

interface UIState {
  profile: Profile | null;
  likedTracks: Like[];
  playlists: Playlist[];
  accentColor: string;
  isAccentDark: boolean;
  isLoadingData: boolean;
  showCreatePlaylistModal: boolean;
  showSleepTimerModal: boolean;
  offlineMode: boolean;
  activeVideoId: string | null;

  // Actions
  setProfile: (profile: Profile | null) => void;
  loadUserData: () => Promise<void>;
  toggleLike: (track: { id: string; title: string; artist: string; coverUrl: string | null; duration: number; sourceUrl: string }) => Promise<void>;
  isLiked: (trackId: string) => boolean;
  createPlaylist: (name: string, description?: string) => Promise<Playlist | null>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  setAccentColor: (color: string) => void;
  setShowCreatePlaylistModal: (show: boolean) => void;
  setShowSleepTimerModal: (show: boolean) => void;
  setOfflineMode: (offline: boolean) => void;
  playVideo: (videoId: string) => void;
  closeVideo: () => void;
  logout: () => Promise<void>;
}

export const useUIStore = create<UIState>((set, get) => ({
  profile: null,
  likedTracks: [],
  playlists: [],
  accentColor: '#8B5CF6', // Violet-500 default
  isAccentDark: true,
  isLoadingData: false,
  showCreatePlaylistModal: false,
  showSleepTimerModal: false,
  offlineMode: false,
  activeVideoId: null,

  setProfile: (profile) => set({ profile }),

  loadUserData: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ profile: null, likedTracks: [], playlists: [] });
      return;
    }

    set({ isLoadingData: true });

    try {
      // Get profile
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // Self-healing: If user exists in Auth but has no row in public.profiles table
      if (!profile) {
        console.log('Profile row not found for logged in user. Creating on the fly...');
        const newProfile = {
          id: user.id,
          email: user.email!,
          display_name: user.user_metadata?.full_name || user.email!.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url || null
        };
        const { data: insertedProfile, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (!insertError && insertedProfile) {
          profile = insertedProfile;
        } else {
          console.error('Failed to auto-create profile row:', insertError);
        }
      }

      // Get likes
      const { data: likes } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Get playlists
      const { data: playlists } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Get preferences
      let { data: prefs } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Self-healing: If preferences row doesn't exist
      if (!prefs && profile) {
        console.log('Preferences row not found. Creating on the fly...');
        const newPrefs = {
          user_id: user.id,
          theme: 'dark',
          volume_default: 0.8,
          accent_color: '#8B5CF6'
        };
        const { data: insertedPrefs, error: prefsError } = await supabase
          .from('preferences')
          .insert(newPrefs)
          .select()
          .single();

        if (!prefsError && insertedPrefs) {
          prefs = insertedPrefs;
        }
      }

      set({
        profile: profile || {
          id: user.id,
          email: user.email!,
          display_name: user.user_metadata?.full_name || user.email!.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url || null,
          created_at: new Date().toISOString()
        },
        likedTracks: likes || [],
        playlists: playlists || [],
        accentColor: prefs?.accent_color || '#8B5CF6',
        isLoadingData: false
      });
    } catch (err) {
      console.error('Error loading user data:', err);
      set({ isLoadingData: false });
    }
  },

  toggleLike: async (track) => {
    const { profile, likedTracks } = get();
    if (!profile) {
      // Fallback to local storage likes if not logged in
      if (typeof window !== 'undefined') {
        const localLikes = JSON.parse(localStorage.getItem('sonique_likes') || '[]');
        const exists = localLikes.some((t: any) => t.id === track.id);
        let updated;
        if (exists) {
          updated = localLikes.filter((t: any) => t.id !== track.id);
          // Log dislike/unlike
          trackLike(track, -1);
        } else {
          updated = [{ ...track, track_id: track.id, created_at: new Date().toISOString() }, ...localLikes];
          // Log like
          trackLike(track, 1);
        }
        localStorage.setItem('sonique_likes', JSON.stringify(updated));
        
        // Mock Like items structure
        set({ likedTracks: updated });
        window.dispatchEvent(new Event('sonique_likes_changed'));
      }
      return;
    }

    const exists = likedTracks.some((t) => t.track_id === track.id);

    try {
      if (exists) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', profile.id)
          .eq('track_id', track.id);

        set({ likedTracks: likedTracks.filter((t) => t.track_id !== track.id) });
        // Log dislike/unlike
        trackLike(track, -1);
      } else {
        const newLike = {
          user_id: profile.id,
          track_id: track.id,
          title: track.title,
          artist: track.artist,
          cover_url: track.coverUrl,
          duration: track.duration,
          source_url: track.sourceUrl
        };

        const { data, error } = await supabase
          .from('likes')
          .insert(newLike)
          .select()
          .single();

        if (data) {
          set({ likedTracks: [data, ...likedTracks] });
          // Log like
          trackLike(track, 1);
        }
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  },

  isLiked: (trackId) => {
    return get().likedTracks.some((t) => t.track_id === trackId || t.id === trackId);
  },

  createPlaylist: async (name, description = '') => {
    const { profile, playlists } = get();
    if (!profile) return null;

    try {
      const newPlaylist = {
        user_id: profile.id,
        name,
        description,
        cover_url: null
      };

      const { data, error } = await supabase
        .from('playlists')
        .insert(newPlaylist)
        .select()
        .single();

      if (data) {
        set({ playlists: [data, ...playlists] });
        // Log playlist creation to personalized recommendation engine
        trackGenericAction('playlist_create', { playlist_id: data.id, name: data.name });
        return data;
      }
    } catch (err) {
      console.error('Error creating playlist:', err);
    }
    return null;
  },

  deletePlaylist: async (playlistId) => {
    const { profile, playlists } = get();
    if (!profile) return;

    try {
      await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId)
        .eq('user_id', profile.id);

      set({ playlists: playlists.filter((p) => p.id !== playlistId) });
    } catch (err) {
      console.error('Error deleting playlist:', err);
    }
  },

  setAccentColor: (color) => {
    // Determine if color is dark or light to adjust UI contrast (simple helper)
    // Accept hex color and set
    set({ accentColor: color });
    
    // Save to preferences if logged in
    const { profile } = get();
    if (profile) {
      supabase
        .from('preferences')
        .update({ accent_color: color })
        .eq('user_id', profile.id)
        .then(({ error }) => {
          if (error) console.error(error);
        });
    }
  },

  setShowCreatePlaylistModal: (show) => set({ showCreatePlaylistModal: show }),
  setShowSleepTimerModal: (show) => set({ showSleepTimerModal: show }),
  setOfflineMode: (offline) => set({ offlineMode: offline }),
  playVideo: (videoId) => set({ activeVideoId: videoId }),
  closeVideo: () => set({ activeVideoId: null }),

  logout: async () => {
    await supabase.auth.signOut();
    set({ profile: null, likedTracks: [], playlists: [] });
  }
}));

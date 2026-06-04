import { create } from 'zustand';
import { fetchLyrics, LyricLine } from '../lib/lrclib';
import { trackPlay, trackSkip, trackGenericAction } from '../lib/recommendations';
import { API_BASE } from '../lib/config';
import { createYouTubeAudioElement } from '../lib/youtubePlayer';


export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  coverUrl: string | null;
  duration: number; // in seconds
  sourceUrl: string;
  confidence?: number;
  genre?: string;
  hasVideo?: boolean;
}

interface PlayerState {
  queue: PlayerTrack[];
  shuffledQueue: PlayerTrack[];
  currentIndex: number;
  isPlaying: boolean;
  isShuffle: boolean;
  repeatMode: 'none' | 'one' | 'all';
  volume: number;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  showFullscreenPlayer: boolean;
  showQueueList: boolean;
  lyrics: LyricLine[];
  isLyricsLoading: boolean;
  currentLyricIndex: number;
  audio: HTMLAudioElement | null;
  sleepTimer: number | null; // in minutes remaining
  sleepTimerActive: boolean;
  isVideoMode: boolean;

  // Actions
  initAudio: () => void;
  playTrack: (track: PlayerTrack, fromQueue?: PlayerTrack[], isVideo?: boolean) => void;
  playPlaylist: (tracks: PlayerTrack[], startIndex?: number) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setVideoMode: (enabled: boolean) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (track: PlayerTrack) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setShowFullscreenPlayer: (show: boolean) => void;
  setShowQueueList: (show: boolean) => void;
  fetchLyricsForCurrent: () => Promise<void>;
  setSleepTimer: (minutes: number | null) => void;
  decrementSleepTimer: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => {
  // Safe instantiation of Audio inside browser only
  let globalAudio: HTMLAudioElement | null = null;

  return {
    queue: [],
    shuffledQueue: [],
    currentIndex: -1,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 'all',
    volume: 0.8,
    isMuted: false,
    currentTime: 0,
    duration: 0,
    showFullscreenPlayer: false,
    showQueueList: false,
    lyrics: [],
    isLyricsLoading: false,
    currentLyricIndex: -1,
    audio: null,
    sleepTimer: null,
    sleepTimerActive: false,
    isVideoMode: false,
    setVideoMode: (enabled) => set({ isVideoMode: enabled }),

    initAudio: () => {
      if (typeof window === 'undefined' || get().audio) return;

      globalAudio = createYouTubeAudioElement();
      globalAudio.volume = get().volume;

      // Event Listeners
      globalAudio.addEventListener('play', () => {
        set({ isPlaying: true });
      });

      globalAudio.addEventListener('pause', () => {
        set({ isPlaying: false });
      });

      globalAudio.addEventListener('timeupdate', () => {
        if (!globalAudio) return;
        const curTime = globalAudio.currentTime;
        set({ currentTime: curTime });

        // Update active lyric line index
        const lyrics = get().lyrics;
        if (lyrics.length > 0) {
          let activeIndex = -1;
          for (let i = 0; i < lyrics.length; i++) {
            if (curTime >= lyrics[i].time) {
              activeIndex = i;
            } else {
              break;
            }
          }
          if (activeIndex !== get().currentLyricIndex) {
            set({ currentLyricIndex: activeIndex });
          }
        }
      });

      globalAudio.addEventListener('durationchange', () => {
        if (globalAudio) {
          set({ duration: globalAudio.duration || 0 });
        }
      });

      globalAudio.addEventListener('ended', () => {
        const { repeatMode, queue, shuffledQueue, isShuffle, currentIndex } = get();
        const activeQueue = isShuffle ? shuffledQueue : queue;
        const currentTrack = activeQueue[currentIndex];
        
        if (currentTrack) {
          trackGenericAction('song_complete', { track_id: currentTrack.id, title: currentTrack.title });
        }

        if (repeatMode === 'one') {
          if (currentTrack) {
            trackGenericAction('song_replay', { track_id: currentTrack.id, title: currentTrack.title });
          }
          if (globalAudio) {
            globalAudio.currentTime = 0;
            globalAudio.play().catch(console.error);
          }
        } else {
          get().next();
        }
      });

      set({ audio: globalAudio });
    },

    playTrack: (track, fromQueue, isVideo) => {
      get().initAudio();
      const currentAudio = get().audio;
      if (!currentAudio) return;

      // Check if we are toggling mode for the same track
      const activeTrack = get().queue[get().currentIndex];
      const isSameTrack = activeTrack !== undefined && activeTrack.id === track.id;
      const preservedTime = isSameTrack ? get().currentTime : 0;

      const shouldPlayVideo = isVideo !== undefined ? isVideo : (track.hasVideo || false);
      set({ isVideoMode: shouldPlayVideo });

      const isSingleTrackPlay = !fromQueue || fromQueue.length <= 1;
      let newQueue = isSameTrack ? get().queue : (isSingleTrackPlay ? [track] : (fromQueue || get().queue));
      let trackIndex = isSameTrack ? get().currentIndex : newQueue.findIndex((t) => t.id === track.id);

      if (trackIndex === -1 && !isSameTrack) {
        newQueue = [...newQueue, track];
        trackIndex = newQueue.length - 1;
      }

      set({
        queue: newQueue,
        currentIndex: trackIndex,
        currentTime: preservedTime,
        lyrics: isSameTrack ? get().lyrics : [],
        currentLyricIndex: isSameTrack ? get().currentLyricIndex : -1,
      });

      // Update shuffle queue if enabled
      if (get().isShuffle) {
        const remaining = newQueue.filter((_, idx) => idx !== trackIndex);
        const shuffled = [track, ...remaining.sort(() => Math.random() - 0.5)];
        set({ shuffledQueue: shuffled, currentIndex: 0 });
      }

      currentAudio.src = track.sourceUrl;
      currentAudio.load();
      if (preservedTime > 0) {
        currentAudio.currentTime = preservedTime;
      }
      currentAudio.play()
        .then(() => {
          set({ isPlaying: true });
          if (!isSameTrack) {
            get().fetchLyricsForCurrent();
          }
          
          // Log play action to personalized engine
          trackPlay(track);
          
          // Save to browser listening history (Local Cache) & Add to Supabase History asynchronously
          if (typeof window !== 'undefined') {
            const hist = JSON.parse(localStorage.getItem('sonique_history') || '[]');
            const updated = [track, ...hist.filter((h: any) => h.id !== track.id)].slice(0, 50);
            localStorage.setItem('sonique_history', JSON.stringify(updated));
            // Dispatch custom event to update UI instantly
            window.dispatchEvent(new Event('sonique_history_changed'));
          }
        })
        .catch((err) => {
          console.error('Audio playback failed, trying fallback stream...', err);
        });


      // Automatically create a vibe list of at least 50 matching vibe tracks in the background
      const modeChanged = get().isVideoMode !== isVideo;
      if (!isSameTrack || modeChanged) {
        const isVideoOnly = isVideo || get().isVideoMode;
        fetch(`${API_BASE}/vibe/${track.id}${isVideoOnly ? '?video_only=true' : ''}`)
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error('Vibe fetch failed');
          })
          .then((data) => {
            const vibeTracks: PlayerTrack[] = data.tracks || [];
            if (vibeTracks.length > 0) {
              const latestStore = get();
              const activeTrack = latestStore.isShuffle
                ? latestStore.shuffledQueue[latestStore.currentIndex]
                : latestStore.queue[latestStore.currentIndex];

              // Check if we are still playing the exact same track seed
              if (activeTrack && activeTrack.id === track.id) {
                const combinedQueue = [track, ...vibeTracks.filter((t) => t.id !== track.id)];
                
                // Force hasVideo to match the current mode for visual UI consistency in the queue drawer
                const mappedQueue = combinedQueue.map(t => ({
                  ...t,
                  hasVideo: isVideoOnly ? true : t.hasVideo
                }));

                if (latestStore.isShuffle) {
                  const shuffledVibe = [...vibeTracks.filter((t) => t.id !== track.id)].sort(() => Math.random() - 0.5);
                  const mappedShuffled = [track, ...shuffledVibe].map(t => ({
                    ...t,
                    hasVideo: isVideoOnly ? true : t.hasVideo
                  }));
                  set({
                    queue: mappedQueue,
                    shuffledQueue: mappedShuffled,
                    currentIndex: 0
                  });
                } else {
                  set({
                    queue: mappedQueue,
                    currentIndex: 0
                  });
                }
              }
            }
          })
          .catch((err) => {
            console.error('Failed to load matching vibe queue tracks:', err);
          });
      }
    },

    playPlaylist: (tracks, startIndex = 0) => {
      if (tracks.length === 0) return;
      get().initAudio();
      set({ queue: tracks });
      get().playTrack(tracks[startIndex], tracks);
    },

    togglePlay: () => {
      get().initAudio();
      const currentAudio = get().audio;
      if (get().currentIndex === -1) return;
      if (!currentAudio) return;

      if (get().isPlaying) {
        currentAudio.pause();
      } else {
        currentAudio.play().catch(console.error);
      }
    },

    next: () => {
      const { queue, shuffledQueue, isShuffle, currentIndex, repeatMode, audio } = get();
      const currentPlaylist = isShuffle ? shuffledQueue : queue;
      if (currentPlaylist.length === 0) return;

      // Skip tracking
      const activeTrack = currentPlaylist[currentIndex];
      if (activeTrack && audio && !audio.paused && audio.duration > 0) {
        const completionRate = audio.currentTime / audio.duration;
        if (completionRate < 0.9) {
          trackSkip(activeTrack.id, completionRate);
        }
      }

      let nextIndex = currentIndex + 1;

      if (nextIndex >= currentPlaylist.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          // Playback finished, stop
          set({ isPlaying: false });
          return;
        }
      }

      get().playTrack(currentPlaylist[nextIndex], currentPlaylist, get().isVideoMode);
    },

    previous: () => {
      const { queue, shuffledQueue, isShuffle, currentIndex, currentTime, audio } = get();
      const currentPlaylist = isShuffle ? shuffledQueue : queue;
      if (currentPlaylist.length === 0) return;

      // If playing for more than 3 seconds, restart the song (counts as song replay!)
      if (currentTime > 3 && audio) {
        const activeTrack = currentPlaylist[currentIndex];
        if (activeTrack) {
          trackGenericAction('song_replay', { track_id: activeTrack.id, title: activeTrack.title });
        }
        audio.currentTime = 0;
        set({ currentTime: 0 });
        return;
      }

      // Skip tracking
      const activeTrack = currentPlaylist[currentIndex];
      if (activeTrack && audio && !audio.paused && audio.duration > 0) {
        const completionRate = audio.currentTime / audio.duration;
        if (completionRate < 0.9) {
          trackSkip(activeTrack.id, completionRate);
        }
      }

      let prevIndex = currentIndex - 1;
      if (prevIndex < 0) {
        prevIndex = currentPlaylist.length - 1;
      }

      get().playTrack(currentPlaylist[prevIndex], currentPlaylist, get().isVideoMode);
    },

    seek: (time) => {
      const currentAudio = get().audio;
      set({ currentTime: time });
      if (currentAudio) {
        currentAudio.currentTime = time;
      }
      
      // Update active lyric index
      const lyrics = get().lyrics;
      if (lyrics.length > 0) {
        let activeIndex = -1;
        for (let i = 0; i < lyrics.length; i++) {
          if (time >= lyrics[i].time) {
            activeIndex = i;
          } else {
            break;
          }
        }
        if (activeIndex !== get().currentLyricIndex) {
          set({ currentLyricIndex: activeIndex });
        }
      }
    },

    setVolume: (volume) => {
      const currentAudio = get().audio;
      if (currentAudio) {
        currentAudio.volume = volume;
      }
      set({ volume, isMuted: volume === 0 });
    },

    toggleMute: () => {
      const { isMuted, volume, audio } = get();
      const nextMute = !isMuted;
      if (audio) {
        audio.muted = nextMute;
      }
      set({ isMuted: nextMute });
    },

    toggleShuffle: () => {
      const { isShuffle, queue, currentIndex } = get();
      const nextShuffle = !isShuffle;

      if (nextShuffle && currentIndex !== -1) {
        const currentTrack = queue[currentIndex];
        const remaining = queue.filter((_, idx) => idx !== currentIndex);
        const shuffled = [currentTrack, ...remaining.sort(() => Math.random() - 0.5)];
        set({
          isShuffle: nextShuffle,
          shuffledQueue: shuffled,
          currentIndex: 0,
        });
      } else {
        // Turning off shuffle, find track index in normal queue
        const currentTrack = get().shuffledQueue[currentIndex];
        const originalIndex = currentTrack ? queue.findIndex((t) => t.id === currentTrack.id) : -1;
        set({
          isShuffle: nextShuffle,
          currentIndex: originalIndex,
        });
      }
    },

    toggleRepeat: () => {
      const { repeatMode } = get();
      let nextMode: 'none' | 'one' | 'all' = 'all';
      if (repeatMode === 'all') nextMode = 'one';
      else if (repeatMode === 'one') nextMode = 'none';
      else nextMode = 'all';

      set({ repeatMode: nextMode });
    },

    addToQueue: (track) => {
      const { queue, shuffledQueue, isShuffle } = get();
      if (queue.some((t) => t.id === track.id)) return;

      const nextQueue = [...queue, track];
      const nextShuffled = isShuffle ? [...shuffledQueue, track] : shuffledQueue;

      set({
        queue: nextQueue,
        shuffledQueue: nextShuffled,
      });
    },

    removeFromQueue: (trackId) => {
      const { queue, shuffledQueue, currentIndex, isShuffle } = get();
      const activeTrack = isShuffle ? shuffledQueue[currentIndex] : queue[currentIndex];

      const nextQueue = queue.filter((t) => t.id !== trackId);
      const nextShuffled = shuffledQueue.filter((t) => t.id !== trackId);

      // Re-evaluate current index
      let nextIndex = -1;
      const targetList = isShuffle ? nextShuffled : nextQueue;
      if (activeTrack) {
        nextIndex = targetList.findIndex((t) => t.id === activeTrack.id);
      }

      set({
        queue: nextQueue,
        shuffledQueue: nextShuffled,
        currentIndex: nextIndex,
      });
    },

    clearQueue: () => {
      const currentAudio = get().audio;
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }
      set({
        queue: [],
        shuffledQueue: [],
        currentIndex: -1,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        lyrics: [],
        currentLyricIndex: -1,
      });
    },

    setCurrentTime: (time) => {
      set({ currentTime: time });
      
      // Update active lyric index
      const lyrics = get().lyrics;
      if (lyrics.length > 0) {
        let activeIndex = -1;
        for (let i = 0; i < lyrics.length; i++) {
          if (time >= lyrics[i].time) {
            activeIndex = i;
          } else {
            break;
          }
        }
        if (activeIndex !== get().currentLyricIndex) {
          set({ currentLyricIndex: activeIndex });
        }
      }
    },
    setDuration: (duration) => set({ duration }),
    setShowFullscreenPlayer: (show) => set({ showFullscreenPlayer: show }),
    setShowQueueList: (show) => set({ showQueueList: show }),

    fetchLyricsForCurrent: async () => {
      const { queue, shuffledQueue, isShuffle, currentIndex } = get();
      const currentPlaylist = isShuffle ? shuffledQueue : queue;
      const track = currentPlaylist[currentIndex];

      if (!track) return;

      set({ isLyricsLoading: true, lyrics: [], currentLyricIndex: -1 });

      try {
        const data = await fetchLyrics(track.title, track.artist, track.duration);
        if (data) {
          set({ lyrics: data.parsedLines, isLyricsLoading: false });
        } else {
          set({
            lyrics: [{ time: 0, text: 'Lyrics not available' }],
            isLyricsLoading: false,
          });
        }
      } catch (err) {
        console.error(err);
        set({
          lyrics: [{ time: 0, text: 'Failed to load lyrics' }],
          isLyricsLoading: false,
        });
      }
    },

    setSleepTimer: (minutes) => {
      set({
        sleepTimer: minutes,
        sleepTimerActive: minutes !== null,
      });
    },

    decrementSleepTimer: () => {
      const { sleepTimer, sleepTimerActive, isPlaying, audio } = get();
      if (!sleepTimerActive || sleepTimer === null) return;

      if (sleepTimer <= 1) {
        // Timer finished! Pause audio
        if (audio && isPlaying) {
          audio.pause();
        }
        set({
          sleepTimer: null,
          sleepTimerActive: false,
        });
      } else {
        set({ sleepTimer: sleepTimer - 1 });
      }
    },
  };
});

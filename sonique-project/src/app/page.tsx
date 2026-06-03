'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrackCard } from '../components/track/TrackCard';
import { PlayerTrack } from '../store/usePlayerStore';
import { useUIStore } from '../store/useUIStore';
import { Sparkles, Music, Disc, Grid, User, History, Compass, Flame, Album, Tv } from 'lucide-react';
import { getHomeShelves, HomeShelvesData, RecTrack, fetchTrendingVideos, RecVideo } from '../lib/recommendations';
import { VideoCard } from '../components/video/VideoCard';
import { API_BASE } from '../lib/config';

// Valid YouTube Music Album Browse IDs
const musicAlbums = [
  { id: 'MPREb_E4GfUXfDfhy', name: 'Aashiqui 2', cover: 'https://yt3.googleusercontent.com/3q33amH9hzn1dO8IeAX7TMb1QtEVfvVbqd2eSCaelOXNVmfMjbpDYdqD2HSiXtNP6i5Es7oynkWU2NfOXA=w544-h544-l90-rj' },
  { id: 'MPREb_iM8jILFK2Qm', name: 'Brahmastra', cover: 'https://yt3.googleusercontent.com/eLoQKzskAIeNPego41FH2sz5uFy-A3Ynf1rcNdQ4eKv4J10atKk_RKbZDnQ3Ja-UNM8mKSu_-8gNeVYp4g=w544-h544-l90-rj' },
  { id: 'MPREb_RcOqUyfS2Bi', name: 'Kabir Singh', cover: 'https://yt3.googleusercontent.com/loAKTa9XpvZzV-TORspRPC978Kk_u2l6tYlHTHm-sYfwjmKsJdShoxbmLoPKoq9eZgq-uzpoRPtqEWX09w=w544-h544-l90-rj' },
  { id: 'MPREb_QFpeH3GzBe4', name: 'Yeh Jawaani Hai Deewani', cover: 'https://yt3.googleusercontent.com/8WRsPwoMoabdu5ISlf9f7tGGPzd2I7CTaWxc8qd6GYjaEBreC2Yw0KWMId6Y2vUTqSkt7GdlUi4NAXyf=w544-h544-l90-rj' },
  { id: 'MPREb_apAhqhJObbd', name: 'Bhediya', cover: 'https://yt3.googleusercontent.com/5yKTPfOWf1AhqP0QY29N1uOL3lYq4hq9ZCJoWgugoB_WSf_MVHkr-C5FRuWJsakWjlaPzhiy1_fZHjxx=w544-h544-l90-rj' },
  { id: 'MPREb_FNWEz3Y5YyZ', name: 'Munjya', cover: 'https://yt3.googleusercontent.com/7BiezafiDJcnp1s7UffTwd_VM9xVTZFzmb_yoiM4O2HEXecTA2OkW2CySTmqsyxeQsd36fv5P2FmBls=w544-h544-l90-rj' },
  { id: 'MPREb_E9Diy6kXmlV', name: 'Rockstar', cover: 'https://yt3.googleusercontent.com/KYw74XSQwtKPbZTrHMNEBAnEMg1P1gNGwymnZwBSjstbqSE-MpigGlTIy6IZvC-ERlRkeP0c7VTiZObS=w544-h544-l90-rj' },
  { id: 'MPREb_Wv34uDr4ODd', name: 'Dilwale', cover: 'https://yt3.googleusercontent.com/7FxbxKIussM0Pu0YJa9eXy2eN9-f8g82NFoKpeepDQavqn_Auja9TzR_9b1wgMrfHQrGDLOtQymO-PfZ=w544-h544-l90-rj' },
  { id: 'MPREb_suGXcALkg8R', name: 'Ae Dil Hai Mushkil', cover: 'https://yt3.googleusercontent.com/0eoKSZD2aThVTG85MaO4j6r_pVMmDlvnlMWmhGEn9WBak9Ncu9uFRYh82uKZqqouebyaBcI4WLhvQrml=w544-h544-l90-rj' },
  { id: 'MPREb_iE3Pd08juWf', name: 'Shershaah', cover: 'https://yt3.googleusercontent.com/iL_YgaRWLLzfwYP1mL9mTl0776jHYymJnsNcQlkzztzVEks8z__hMIKIvMfggcaqLah3pdQxR1NcWnPf=w544-h544-l90-rj' },
  { id: 'MPREb_PrESMGET7eK', name: 'Animal', cover: 'https://yt3.googleusercontent.com/tM7On61s7pbU8DsHeusopX-HRQerc4Xyv2Pc5Nveb3F932QuadCwslZEP_yeU7iQk2XX9w-r63nZgZk=w544-h544-l90-rj' },
  { id: 'MPREb_kOsn8M38LcA', name: 'Laila Majnu', cover: 'https://yt3.googleusercontent.com/0is50INmTrcfZEK3onQ67l6lxLM6ECEhjuPbepEsqnqOsRse3G6ortxZxBGtSI---0GI0nVIF4CoObYaSw=w544-h544-l90-rj' }
];



export default function HomePage() {
  const router = useRouter();
  const { accentColor, profile } = useUIStore();
  
  // State variables
  const [shelves, setShelves] = useState<HomeShelvesData | null>(null);
  const [trendingVideos, setTrendingVideos] = useState<RecVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleShelvesCount, setVisibleShelvesCount] = useState(4);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Define shelves structure matching user request + new music albums sections
  const rawShelves = shelves
    ? [
        {
          id: 'recommended_for_you',
          title: 'Recommended For You',
          icon: <Sparkles className="w-5 h-5 text-emerald-400" />,
          tracks: shelves.recommended_for_you || []
        },
        {
          id: 'recent_listening_based',
          title: 'Based On Your Recent Listening',
          icon: <History className="w-5 h-5 text-violet-400" />,
          tracks: shelves.recent_listening_based || []
        },
        {
          id: 'music_albums',
          title: 'Popular Music Albums',
          icon: <Album className="w-5 h-5 text-teal-400" />,
          albums: shelves.music_albums || musicAlbums
        },
        {
          id: 'trending_videos',
          title: 'Trending Music Videos',
          icon: <Tv className="w-5 h-5 text-red-500 animate-pulse" />,
          videos: trendingVideos
        },
        {
          id: 'artist_focus',
          title: `Because You Listened To ${shelves.artist_focus?.artist || 'Top Artists'}`,
          icon: <User className="w-5 h-5 text-pink-400" />,
          tracks: shelves.artist_focus?.tracks || []
        },
        {
          id: 'similar_artists',
          title: profile ? 'Similar Artists' : 'Popular Artists',
          icon: <User className="w-5 h-5 text-blue-400" />,
          artists: shelves.similar_artists || []
        },

        {
          id: 'daily_mix',
          title: profile ? 'Daily Mix' : 'Daily Mixes',
          icon: <Disc className="w-5 h-5 text-amber-400" />,
          tracks: shelves.daily_mix || []
        },
        {
          id: 'trending_now',
          title: 'Trending Now',
          icon: <Flame className="w-5 h-5 text-red-500" />,
          tracks: shelves.trending_now || []
        },
        {
          id: 'new_releases',
          title: 'New Releases',
          icon: <Compass className="w-5 h-5 text-teal-400" />,
          tracks: shelves.new_releases || []
        },
        {
          id: 'continue_listening',
          title: 'Continue Listening',
          icon: <Grid className="w-5 h-5 text-cyan-400" />,
          tracks: shelves.continue_listening || []
        },
        {
          id: 'recently_played',
          title: 'Recently Played',
          icon: <History className="w-5 h-5 text-orange-400" />,
          tracks: shelves.recently_played || []
        },
        {
          id: 'discover_new',
          title: profile ? 'Discover New Music' : 'Discover New Music with Fresh Songs',
          icon: <Music className="w-5 h-5 text-indigo-400" />,
          tracks: shelves.discover_new || []
        }
      ]
    : [];

  // Filter shelvesList: if no profile (guest), show only the specific guest shelves
  const shelvesList = profile
    ? rawShelves
    : rawShelves.filter(shelf => [
        'recommended_for_you',
        'music_albums',
        'trending_videos',
        'similar_artists',
        'daily_mix',
        'trending_now',
        'new_releases',
        'discover_new'
      ].includes(shelf.id));

  // Helper to convert RecTrack to PlayerTrack
  const convertToPlayerTrack = (track: RecTrack): PlayerTrack => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    coverUrl: track.coverUrl,
    duration: track.duration,
    sourceUrl: `${API_BASE}/stream/${track.id}?redirect=true`,
    confidence: track.confidence,
    genre: track.genre
  });

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Load home data (with background refresh & cache checking)
  const loadHomeData = async (forceRefresh = false) => {
    // 1. Try local session cache first to get zero-latency startup
    if (!forceRefresh) {
      const cached = sessionStorage.getItem('sonique_home_shelves');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setShelves(parsed);
          setLoading(false);
        } catch (e) {
          console.error('Failed to parse cached home shelves:', e);
        }
      }
    }

    // 2. Fetch fresh recommendations in background
    try {
      const [data, videos] = await Promise.all([
        getHomeShelves(),
        fetchTrendingVideos()
      ]);
      if (data) {
        setShelves(data);
        sessionStorage.setItem('sonique_home_shelves', JSON.stringify(data));
      }
      if (videos) {
        setTrendingVideos(videos);
      }
    } catch (err) {
      console.error('Failed to fetch home recommendations or videos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadHomeData();
  }, []);

  // Listen to actions completion refresh event
  useEffect(() => {
    const handleRefresh = () => {
      // Force background update without flash loading state
      loadHomeData(true);
    };
    window.addEventListener('sonique_recs_refresh', handleRefresh);
    return () => {
      window.removeEventListener('sonique_recs_refresh', handleRefresh);
    };
  }, []);

  // Infinite scroll observer for lazy shelves rendering
  useEffect(() => {
    const totalShelves = shelvesList.length;
    if (visibleShelvesCount >= totalShelves || !shelves) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Increment by 2 shelves at a time
          setVisibleShelvesCount((prev) => Math.min(prev + 2, totalShelves));
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [visibleShelvesCount, shelves, shelvesList.length]);

  // Loading indicator / skeleton
  if (loading && !shelves) {
    return (
      <div className="space-y-8 animate-pulse pb-8">
        <div className="h-40 bg-zinc-900/60 rounded-2xl w-full border border-white/5" />
        {[...Array(3)].map((_, index) => (
          <div key={index} className="space-y-4">
            <div className="h-6 bg-zinc-900/60 rounded w-48 border border-white/5" />
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-48 md:w-52 aspect-square bg-zinc-900/40 rounded-xl border border-white/5 shrink-0" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-8 select-none">
      {/* 1. Hero Banner */}
      <section className="relative rounded-2xl bg-gradient-to-r from-zinc-900/60 to-zinc-950/20 border border-white/5 p-6 md:p-8 overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Disc className="w-40 h-40 animate-spin-slow" style={{ color: accentColor }} />
        </div>
        <div className="relative z-10 space-y-2">
          {profile ? (
            <>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>AI recommendation engine active</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                {getGreeting()}
              </h1>
              <p className="text-zinc-400 text-sm md:text-base max-w-lg">
                Your personalized feed is learning and updating in real-time based on your listens, skips, and playlist preferences.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
                <span>Welcome to Sonique Music</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                Discover Your Perfect Sound
              </h1>
              <p className="text-zinc-400 text-sm md:text-base max-w-lg">
                Explore handpicked tracks, popular albums, and trending mixes. <Link href="/login" className="font-bold underline hover:text-white transition" style={{ color: accentColor }}>Sign up or Log in</Link> to start tracking your mood and unlock personalized mixes tailored to your vibe!
              </p>
            </>
          )}
        </div>
      </section>

      {/* Render the recommendation shelves with horizontal scrolling */}
      {shelvesList.slice(0, profile ? visibleShelvesCount : shelvesList.length).map((shelf) => {
        // Skip empty shelves
        const hasTracks = 'tracks' in shelf && shelf.tracks && shelf.tracks.length > 0;
        const hasArtists = 'artists' in shelf && shelf.artists && shelf.artists.length > 0;
        const hasAlbums = 'albums' in shelf && shelf.albums && shelf.albums.length > 0;
        const hasVideos = 'videos' in shelf && shelf.videos && shelf.videos.length > 0;
        if (!hasTracks && !hasArtists && !hasAlbums && !hasVideos) return null;

        return (
          <section key={shelf.id} className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {shelf.icon}
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-black">
                  {shelf.title}
                </h2>
              </div>
            </div>

            {/* Check if it's an artist, track, or album shelf */}
            {'artists' in shelf && shelf.artists ? (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {shelf.artists.map((artist) => (
                  <div
                    key={artist.id}
                    onClick={() => router.push(`/artist/${artist.id}`)}
                    className="group flex flex-col items-center gap-3 bg-zinc-900/20 hover:bg-zinc-800/40 p-4 rounded-xl border border-white/5 shadow-md transition duration-300 cursor-pointer text-center w-36 shrink-0"
                  >
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-zinc-800 border border-white/10 overflow-hidden shadow-md group-hover:scale-105 transition duration-300">
                      {artist.avatar ? (
                        <img src={artist.avatar} alt={artist.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-zinc-300 group-hover:text-white truncate w-full">
                      {artist.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : 'albums' in shelf && shelf.albums ? (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {shelf.albums.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => router.push(`/album/${album.id}`)}
                    className="group bg-zinc-900/40 hover:bg-zinc-800/40 p-4 rounded-xl border border-white/5 shadow-md flex flex-col gap-3 transition hover:-translate-y-1 duration-300 cursor-pointer w-48 md:w-52 shrink-0"
                  >
                    <div className="aspect-square w-full rounded-lg overflow-hidden border border-white/10 bg-zinc-850">
                      <img 
                        src={album.cover} 
                        alt={album.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/placeholder.png";
                        }}
                      />
                    </div>
                    <div className="text-left overflow-hidden w-full">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-violet-400 transition">{album.name}</h4>
                    </div>
                  </div>
                ))}
              </div>
            ) : 'videos' in shelf && shelf.videos ? (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {shelf.videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {'tracks' in shelf && shelf.tracks && shelf.tracks.map((track, idx) => (
                  <div key={`${track.id}-${idx}`} className="w-48 md:w-52 shrink-0">
                    <TrackCard track={convertToPlayerTrack(track)} />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Infinite Scroll Trigger element */}
      {profile && visibleShelvesCount < shelvesList.length && (
        <div ref={loadMoreRef} className="flex justify-center py-6">
          <div 
            className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${accentColor} transparent transparent transparent` }}
          />
        </div>
      )}
    </div>
  );
}

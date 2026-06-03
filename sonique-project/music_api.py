import os
import sys
import time
import requests
import subprocess
import imageio_ffmpeg
import re
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, jsonify, request, redirect, Response, stream_with_context
from flask_cors import CORS
from ytmusicapi import YTMusic
import yt_dlp
import recommendation_engine

app = Flask(__name__)
CORS(app)  # Allow your frontend to access this API
ytmusic = YTMusic()  # YouTube Music API (no auth needed)

# Mapping to link song Art Track videoIds to their matched Official Music Video videoIds
song_to_video_map = {}

def clean_name(name):
    # Remove parentheses/bracket metadata to get core title
    name = re.sub(r'[\(\[\{].*?[\)\]\}]', '', name)
    return name.strip().lower()

def match_video_for_song(song_info):
    title = song_info.get('title', '')
    artist = song_info.get('artist', '')
    song_id = song_info.get('id', '')
    if not title or not song_id:
        return None
    
    # Try local memory map check first
    if song_id in song_to_video_map:
        return song_to_video_map[song_id]
        
    query = f"{title} {artist} official video"
    try:
        res = ytmusic.search(query, filter="videos", limit=2)
        for video in res:
            v_title = video.get('title', '')
            v_artists = [a['name'].lower() for a in video.get('artists', []) if 'name' in a]
            
            # Check if artist and title match closely
            artist_match = any(artist.lower() in a or a in artist.lower() for a in v_artists)
            
            title_clean = clean_name(title)
            v_title_clean = clean_name(v_title)
            title_match = title_clean in v_title_clean or v_title_clean in title_clean
            
            if artist_match and title_match:
                matched_id = video.get('videoId')
                if matched_id:
                    song_to_video_map[song_id] = matched_id
                    return matched_id
    except Exception as e:
        print(f"Error matching song {title} to video: {e}")
    return None

# Piped fallback stream resolver
def get_piped_fallback(video_id):
    piped_instances = [
        'https://pipedapi.kavin.rocks',
        'https://api.piped.yt',
        'https://piped-api.lunar.icu',
        'https://pipedapi.us.to'
    ]
    for instance in piped_instances:
        try:
            url = f"{instance}/streams/{video_id}"
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                data = res.json()
                audio_streams = data.get('audioStreams', [])
                if audio_streams:
                    # filter for audio/mp4 (m4a)
                    m4a = [s for s in audio_streams if s.get('mimeType') and 'audio/mp4' in s.get('mimeType')]
                    selected = m4a[0] if m4a else audio_streams[0]
                    return selected.get('url')
        except Exception as e:
            print(f"Piped fallback failed for {instance}: {e}")
    return None

# Invidious fallback stream resolver
def get_invidious_fallback(video_id):
    invidious_instances = [
        'https://yewtu.be',
        'https://invidious.snopyta.org',
        'https://vid.puffyan.us',
        'https://invidious.kavin.rocks'
    ]
    for instance in invidious_instances:
        try:
            url = f"{instance}/api/v1/videos/{video_id}"
            res = requests.get(url, timeout=5)
            if res.status_code == 200:
                data = res.json()
                adaptive_formats = data.get('adaptiveFormats', [])
                if adaptive_formats:
                    # filter for audio formats
                    audio = [f for f in adaptive_formats if f.get('type') and 'audio/' in f.get('type')]
                    if audio:
                        return audio[0].get('url')
        except Exception as e:
            print(f"Invidious fallback failed for {instance}: {e}")
    return None

# Root verification endpoint
@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'status': 'healthy',
        'message': 'Sonique YouTube Music API Server is running successfully on port 5000!',
        'endpoints': {
            'search': '/api/search?q=<query>',
            'stream': '/api/stream/<video_id>?redirect=true',
            'suggestions': '/api/suggestions?q=<query>',
            'song': '/api/song/<video_id>',
            'artist': '/api/artist/<channel_id>',
            'album': '/api/album/<browse_id>',
            'playlist': '/api/playlist/<browse_id>',
            'top': '/api/top'
        }
    })

# Search for songs with SSL/connection retry protection
@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': 'Query required'}), 400
    
    search_limit = int(request.args.get('limit', 50))
    attempts = 0
    results = None
    last_error = None
    while attempts < 3:
        try:
            results = ytmusic.search(query, filter='songs', limit=search_limit)
            break
        except Exception as e:
            last_error = e
            attempts += 1
            time.sleep(0.5)

    if results is None:
        return jsonify({'error': f'Failed to fetch search results: {str(last_error)}'}), 500

    songs = []
    for result in results:
        if 'videoId' in result:
            # Parse duration string (e.g. "3:45") to seconds integer for standard player integration
            duration_str = result.get('duration', '')
            duration_secs = 180  # Default fallback
            if duration_str:
                try:
                    parts = list(map(int, duration_str.split(':')))
                    if len(parts) == 2:
                        duration_secs = parts[0] * 60 + parts[1]
                    elif len(parts) == 3:
                        duration_secs = parts[0] * 3600 + parts[1] * 60 + parts[2]
                except ValueError:
                    pass

            songs.append({
                'id': result['videoId'],
                'title': result.get('title', ''),
                'artist': ', '.join([a['name'] for a in result.get('artists', [])]),
                'album': result.get('album', {}).get('name', '') if result.get('album') else '',
                'duration': duration_secs,
                'thumbnail': result.get('thumbnails', [{}])[-1].get('url', ''),
                'videoId': result['videoId'],
                'hasVideo': False  # Checked in parallel match below
            })
            
    # Run parallel video matching for the top 15 results to keep performance fast
    songs_to_match = songs[:15]
    if songs_to_match:
        try:
            with ThreadPoolExecutor(max_workers=len(songs_to_match)) as executor:
                matched_ids = list(executor.map(match_video_for_song, songs_to_match))
            
            for i, matched_id in enumerate(matched_ids):
                if matched_id:
                    songs[i]['hasVideo'] = True
        except Exception as pe:
            print(f"Parallel matching failed: {pe}")
    
    return jsonify({'songs': songs})

# Get streaming URL for a song (supports direct 302 redirect for Next.js audio tag)
@app.route('/api/stream/<video_id>', methods=['GET'])
def get_stream(video_id):
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'no_warnings': True,
    }
    
    stream_url = None
    
    # Attempt 1: Try local yt-dlp first
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=False)
            stream_url = info.get('url')
    except Exception as e:
        print(f"Local yt-dlp extraction failed for {video_id}: {e}. Trying fallbacks...")
        
    # Attempt 2: Try Piped fallback
    if not stream_url:
        print(f"Attempting Piped fallback for {video_id}...")
        stream_url = get_piped_fallback(video_id)
        
    # Attempt 3: Try Invidious fallback
    if not stream_url:
        print(f"Attempting Invidious fallback for {video_id}...")
        stream_url = get_invidious_fallback(video_id)
        
    if stream_url:
        # If redirect parameter is active, route the browser/audio tag directly to CDN stream
        if request.args.get('redirect', '') == 'true':
            return redirect(stream_url, code=302)
            
        return jsonify({
            'stream_url': stream_url, 
            'status': 'success'
        })
    else:
        return jsonify({'error': 'Failed to resolve stream URL from all sources'}), 500

# Get search suggestions
@app.route('/api/suggestions', methods=['GET'])
def suggestions():
    query = request.args.get('q', '')
    try:
        suggestions = ytmusic.get_search_suggestions(query)
        return jsonify({'suggestions': suggestions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get song details
@app.route('/api/song/<video_id>', methods=['GET'])
def get_song_details(video_id):
    try:
        song = ytmusic.get_song(video_id)
        return jsonify(song)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get vibe/related tracks matching a specific video_id
@app.route('/api/vibe/<video_id>', methods=['GET'])
def get_vibe_tracks(video_id):
    # Resolve Art Track videoId to matched Official Music Video ID
    video_id = song_to_video_map.get(video_id, video_id)
    video_only = request.args.get('video_only', '').lower() == 'true'
    try:
        # Fetch watch playlist with a high limit to ensure enough video tracks
        limit = 150 if video_only else 75
        watch_data = ytmusic.get_watch_playlist(videoId=video_id, limit=limit)
        tracks_list = watch_data.get('tracks', [])
        
        songs = []
        seen_ids = {video_id} # exclude seed song
        
        for track in tracks_list:
            vid = track.get('videoId')
            if vid and vid not in seen_ids:
                has_video = track.get('videoType', '') in ['MUSIC_VIDEO_TYPE_OMV', 'MUSIC_VIDEO_TYPE_UGC']
                
                # If video_only is requested, skip tracks that do not have video
                if video_only and not has_video:
                    continue
                    
                seen_ids.add(vid)
                thumbnail = track.get('thumbnails', [{}])[-1].get('url', '') if track.get('thumbnails') else ''
                if not thumbnail:
                    thumbnail = f"https://img.youtube.com/vi/{vid}/0.jpg"
                
                duration_secs = track.get('duration_seconds') or 180
                artists_list = track.get('artists', [])
                artist_name = ', '.join([a['name'] for a in artists_list if 'name' in a]) if artists_list else 'Unknown Artist'
                
                songs.append({
                    'id': vid,
                    'title': track.get('title', 'Unknown Title'),
                    'artist': artist_name,
                    'coverUrl': thumbnail,
                    'duration': duration_secs,
                    'sourceUrl': f"{request.host_url}api/stream/{vid}?redirect=true",
                    'hasVideo': has_video
                })
                
        # If we didn't get enough tracks, fetch fallback tracks
        if len(songs) < 50:
            try:
                song_details = ytmusic.get_song(video_id)
                video_details = song_details.get('videoDetails', {})
                title = video_details.get('title', '')
                author = video_details.get('author', '')
                if title:
                    search_query = f"{title} {author} related"
                    if video_only:
                        search_query += " official music video"
                    
                    filter_type = 'videos' if video_only else 'songs'
                    search_res = ytmusic.search(search_query, filter=filter_type, limit=80)
                    for track in search_res:
                        vid = track.get('videoId')
                        if vid and vid not in seen_ids:
                            seen_ids.add(vid)
                            thumbnail = track.get('thumbnails', [{}])[-1].get('url', '') if track.get('thumbnails') else ''
                            if not thumbnail:
                                thumbnail = f"https://img.youtube.com/vi/{vid}/0.jpg"
                            
                            duration_str = track.get('duration', '')
                            duration_secs = 180
                            if duration_str:
                                try:
                                    parts = list(map(int, duration_str.split(':')))
                                    if len(parts) == 2:
                                        duration_secs = parts[0] * 60 + parts[1]
                                    elif len(parts) == 3:
                                        duration_secs = parts[0] * 3600 + parts[1] * 60 + parts[2]
                                except:
                                    pass
                                    
                            artists_list = track.get('artists', [])
                            artist_name = ', '.join([a['name'] for a in artists_list if 'name' in a]) if artists_list else 'Unknown Artist'
                            
                            songs.append({
                                'id': vid,
                                'title': track.get('title', 'Unknown Title'),
                                'artist': artist_name,
                                'coverUrl': thumbnail,
                                'duration': duration_secs,
                                'sourceUrl': f"{request.host_url}api/stream/{vid}?redirect=true",
                                'hasVideo': True if video_only else (track.get('videoType', '') in ['MUSIC_VIDEO_TYPE_OMV', 'MUSIC_VIDEO_TYPE_UGC'])
                            })
                            if len(songs) >= 55:
                                break
            except Exception as inner_e:
                print(f"Fallback search failed: {inner_e}")
                
        return jsonify({'tracks': songs[:50]})
    except Exception as e:
        print(f"Failed to fetch vibe tracks: {e}")
        return jsonify({'error': str(e)}), 500

# Get artist info
@app.route('/api/artist/<channel_id>', methods=['GET'])
def get_artist(channel_id):
    try:
        artist = ytmusic.get_artist(channel_id)
        return jsonify(artist)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get album info
@app.route('/api/album/<browse_id>', methods=['GET'])
def get_album(browse_id):
    try:
        album = ytmusic.get_album(browse_id)
        return jsonify(album)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get playlist
@app.route('/api/playlist/<browse_id>', methods=['GET'])
def get_playlist(browse_id):
    try:
        playlist = ytmusic.get_playlist(browse_id, limit=100)
        return jsonify(playlist)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get top songs
@app.route('/api/top', methods=['GET'])
def get_top_songs():
    try:
        top = ytmusic.get_home(limit=6)
        return jsonify({'top': top})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ----------------- PERSONALIZED RECOMMENDATIONS ROUTING -----------------

@app.route('/api/play', methods=['POST'])
def track_play():
    data = request.json or {}
    user_id = data.get('userId', 'guest')
    track = data.get('track')
    if not track or 'id' not in track:
        return jsonify({'error': 'Track metadata with valid id is required'}), 400
    recommendation_engine.record_play(user_id, track)
    return jsonify({'status': 'success', 'message': 'Play logged successfully'})

@app.route('/api/skip', methods=['POST'])
def track_skip():
    data = request.json or {}
    user_id = data.get('userId', 'guest')
    track_id = data.get('trackId')
    completion_rate = data.get('completionRate', 0.0)
    if not track_id:
        return jsonify({'error': 'trackId required'}), 400
    recommendation_engine.record_skip(user_id, track_id, completion_rate)
    return jsonify({'status': 'success', 'message': 'Skip logged successfully'})

@app.route('/api/like', methods=['POST'])
def track_like():
    data = request.json or {}
    user_id = data.get('userId', 'guest')
    track = data.get('track')
    if not track or 'id' not in track:
        return jsonify({'error': 'Track details required'}), 400
    recommendation_engine.record_like(user_id, track, 1)
    return jsonify({'status': 'success', 'message': 'Like logged successfully'})

@app.route('/api/dislike', methods=['POST'])
def track_dislike():
    data = request.json or {}
    user_id = data.get('userId', 'guest')
    track = data.get('track')
    if not track or 'id' not in track:
        return jsonify({'error': 'Track details required'}), 400
    recommendation_engine.record_like(user_id, track, -1)
    return jsonify({'status': 'success', 'message': 'Dislike logged successfully'})

@app.route('/api/playlist/add', methods=['POST'])
def track_playlist_add():
    data = request.json or {}
    user_id = data.get('userId', 'guest')
    playlist_name = data.get('playlistName', 'My Playlist')
    track = data.get('track')
    if not track or 'id' not in track:
        return jsonify({'error': 'Track details required'}), 400
    recommendation_engine.record_playlist_add(user_id, playlist_name, track)
    return jsonify({'status': 'success', 'message': 'Playlist add logged successfully'})

@app.route('/api/action', methods=['POST'])
def track_generic_action():
    data = request.json or {}
    user_id = data.get('userId', 'guest')
    action_type = data.get('actionType')
    meta = data.get('metaData', {})
    if not action_type:
        return jsonify({'error': 'actionType required'}), 400
    recommendation_engine.log_action(user_id, action_type, meta)
    return jsonify({'status': 'success', 'message': f'Action {action_type} logged successfully'})

@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    user_id = request.args.get('userId', 'guest')
    limit = int(request.args.get('limit', 20))
    recs = recommendation_engine.generate_recommendations(user_id, limit=limit)
    return jsonify({'recommendations': recs})

@app.route('/api/home', methods=['GET'])
def get_recommendation_home():
    user_id = request.args.get('userId', 'guest')
    shelves = recommendation_engine.get_home_shelves(user_id)
    return jsonify({'shelves': shelves})

@app.route('/api/trending', methods=['GET'])
def get_trending_songs_list():
    trending = recommendation_engine.get_trending_scores()
    return jsonify({'trending': trending})

@app.route('/api/daily-mix', methods=['GET'])
def get_daily_mix_tracks():
    user_id = request.args.get('userId', 'guest')
    recs = recommendation_engine.generate_recommendations(user_id, limit=30)
    return jsonify({'mix': recs})

@app.route('/api/videos/trending', methods=['GET'])
def get_trending_videos():
    try:
        queries = ["latest official music video", "trending music videos bollywood hits"]
        videos = []
        seen_ids = set()
        for q in queries:
            try:
                results = ytmusic.search(q, filter='videos', limit=20)
                for res in results:
                    vid = res.get('videoId')
                    if vid and vid not in seen_ids:
                        seen_ids.add(vid)
                        duration_str = res.get('duration', '')
                        duration_secs = 180
                        if duration_str:
                            try:
                                parts = list(map(int, duration_str.split(':')))
                                if len(parts) == 2:
                                    duration_secs = parts[0] * 60 + parts[1]
                                elif len(parts) == 3:
                                    duration_secs = parts[0] * 3600 + parts[1] * 60 + parts[2]
                            except:
                                pass
                        artists_list = res.get('artists', [])
                        artist_name = ', '.join([a['name'] for a in artists_list if 'name' in a]) if artists_list else 'Unknown Artist'
                        thumbnail = res.get('thumbnails', [{}])[-1].get('url', '')
                        if not thumbnail:
                            thumbnail = f"https://img.youtube.com/vi/{vid}/0.jpg"
                        
                        videos.append({
                            'id': vid,
                            'title': res.get('title', 'Unknown Title'),
                            'artist': artist_name,
                            'coverUrl': thumbnail,
                            'duration': duration_secs,
                            'views': res.get('views', '10M+ views'),
                            'hasVideo': True
                        })
            except Exception as inner_e:
                print(f"Error querying {q} for videos: {inner_e}")
        return jsonify({'videos': videos[:24]})
    except Exception as e:
        print(f"Failed to fetch trending videos: {e}")
        return jsonify({'error': str(e)}), 500

# In-memory stream URL cache to resolve instant mounts and prevent redundant yt-dlp calls
# Stores video_id: (video_url, audio_url, expiry)
video_stream_cache = {}

# HD video streaming route that merges video and audio streams using ffmpeg on the fly
@app.route('/api/stream/video/hd/<video_id>', methods=['GET'])
def get_video_stream_hd(video_id):
    # Resolve Art Track videoId to matched Official Music Video ID
    video_id = song_to_video_map.get(video_id, video_id)
    start_time = request.args.get('start', '0')
    try:
        start_secs = float(start_time)
        if start_secs < 0:
            start_secs = 0.0
    except ValueError:
        start_secs = 0.0

    now = time.time()
    video_url = None
    audio_url = None

    if video_id in video_stream_cache:
        cached_data = video_stream_cache[video_id]
        if len(cached_data) == 3:
            v_url, a_url, expiry = cached_data
            if now < expiry:
                video_url = v_url
                audio_url = a_url
        elif len(cached_data) == 2:
            url, expiry = cached_data
            if now < expiry:
                video_url = url
                audio_url = None

    if not video_url:
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
            'quiet': True,
            'no_warnings': True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=False)
                req_formats = info.get('requested_formats')
                if req_formats and len(req_formats) >= 2:
                    video_url = req_formats[0].get('url')
                    audio_url = req_formats[1].get('url')
                else:
                    video_url = info.get('url')
                    audio_url = None
                
                if video_url:
                    video_stream_cache[video_id] = (video_url, audio_url, now + 2700)
        except Exception as e:
            print(f"Direct HD stream extraction failed for {video_id}: {e}")
            return jsonify({'error': str(e)}), 500

    if not video_url:
        return jsonify({'error': 'Failed to resolve video stream URLs'}), 500

    ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
    
    cmd = [ffmpeg_bin]
    
    # Add input seeking if start parameter is specified
    if start_secs > 0:
        start_str = f"{start_secs:.3f}"
        cmd += ['-ss', start_str]
        
    cmd += ['-i', video_url]
    
    if audio_url:
        if start_secs > 0:
            cmd += ['-ss', f"{start_secs:.3f}"]
        cmd += ['-i', audio_url]
        
    if audio_url:
        cmd += [
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-map', '0:v:0',
            '-map', '1:a:0',
        ]
    else:
        cmd += [
            '-c:v', 'copy',
        ]
        
    cmd += [
        '-f', 'mp4',
        '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
        'pipe:1'
    ]

    print(f"Streaming HD video for {video_id} starting at {start_secs}s")
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    
    @stream_with_context
    def generate():
        try:
            while True:
                data = process.stdout.read(4096)
                if not data:
                    break
                yield data
        except Exception as e:
            print(f"Streaming error for {video_id}: {e}")
        finally:
            process.terminate()
            try:
                process.wait(timeout=1.0)
            except:
                process.kill()

    return Response(generate(), mimetype='video/mp4', headers={
        'Accept-Ranges': 'none',
        'Content-Type': 'video/mp4',
    })

# Direct progressive video + audio MP4 stream extractor using yt-dlp
@app.route('/api/stream/video/<video_id>', methods=['GET'])
def get_video_stream(video_id):
    # Resolve Art Track videoId to matched Official Music Video ID
    video_id = song_to_video_map.get(video_id, video_id)
    # Simply redirect or return the URL of our custom HD streaming route
    hd_url = f"{request.host_url}api/stream/video/hd/{video_id}"
    if request.args.get('redirect', '') == 'true':
        return redirect(hd_url, code=302)
    return jsonify({
        'stream_url': hd_url,
        'status': 'success'
    })

if __name__ == '__main__':
    # Bind to host 0.0.0.0 to support both IPv4 and IPv6 connections on localhost
    app.run(host='0.0.0.0', port=5000, debug=True)


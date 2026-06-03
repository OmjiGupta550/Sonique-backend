import yt_dlp
import json

ydl_opts = {
    'quiet': True,
    'no_warnings': True,
}

video_id = "JGwWNGJdvx8" # Shape of You official video
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(f'https://www.youtube.com/watch?v={video_id}', download=False)
    formats = info.get('formats', [])
    for f in formats:
        # Check if format has both video and audio (progressive)
        acodec = f.get('acodec')
        vcodec = f.get('vcodec')
        if acodec != 'none' and vcodec != 'none':
            print(f"Format: {f.get('format_id')}, ext: {f.get('ext')}, resolution: {f.get('resolution') or f.get('height')}, note: {f.get('format_note')}, fps: {f.get('fps')}")

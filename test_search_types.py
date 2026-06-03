from ytmusicapi import YTMusic
yt = YTMusic()
results = yt.search("shape of you", limit=15)
for i, r in enumerate(results):
    res_type = r.get('resultType', '')
    vid_type = r.get('videoType', '')
    print(f"[{res_type}] title='{r.get('title')}', videoType='{vid_type}', videoId='{r.get('videoId')}'")

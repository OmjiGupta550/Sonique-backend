from ytmusicapi import YTMusic
import json

yt = YTMusic()
results = yt.search("shape of you", filter="songs", limit=5)
for i, r in enumerate(results):
    print(f"Result {i}: title='{r.get('title')}', videoType='{r.get('videoType')}', videoId='{r.get('videoId')}'")
    # print all keys
    print(f"Keys: {list(r.keys())}")

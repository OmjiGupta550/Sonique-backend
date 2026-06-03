from ytmusicapi import YTMusic
ytmusic = YTMusic()

artists = [
    "Atif Aslam",
    "Sonu Nigam",
    "Lata Mangeshkar",
    "Neha Kakkar",
    "Ed Sheeran",
    "Justin Bieber"
]

for artist in artists:
    try:
        results = ytmusic.search(artist, filter="artists", limit=3)
        if results:
            print(f"Artist: {artist}")
            for r in results:
                print(f"  Name: {r.get('artist')}")
                print(f"  Browse ID: {r.get('browseId')}")
                print(f"  Avatar: {r.get('thumbnails', [{}])[-1].get('url', '')}")
            print("-" * 40)
    except Exception as e:
        print(f"Error searching {artist}: {e}")

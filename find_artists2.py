from ytmusicapi import YTMusic
ytmusic = YTMusic()

artists = ["Atif Aslam", "Sonu Nigam"]
for artist in artists:
    try:
        results = ytmusic.search(artist, filter="artists", limit=2)
        if results:
            print(f"Artist: {artist}")
            for r in results:
                print(f"  Name: {r.get('artist') or r.get('name')}")
                print(f"  Browse ID: {r.get('browseId')}")
                print(f"  Avatar: {r.get('thumbnails', [{}])[-1].get('url', '')}")
            print("-" * 40)
    except Exception as e:
        print(f"Error {artist}: {e}")

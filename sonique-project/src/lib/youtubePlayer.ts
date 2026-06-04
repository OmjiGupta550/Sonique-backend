class YouTubeAudioElement {
  private player: any = null;
  private isReady: boolean = false;
  private videoId: string = "";
  private pendingPlay: boolean = false;
  private queuedSrc: string = "";
  private listeners: { [event: string]: Function[] } = {};
  private _currentTime: number = 0;
  private _duration: number = 0;
  private _volume: number = 1.0;
  private _muted: boolean = false;
  private intervalId: any = null;
  private elementId: string = "hidden-youtube-player-iframe";
  private containerId: string = "hidden-youtube-player-container";

  constructor() {
    if (typeof window === "undefined") return;

    // Create a persistent hidden wrapper div for the iframe if it doesn't exist
    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = this.containerId;
      // Absolute positioning offscreen, hidden by default unless transitioned by layout engine
      container.setAttribute(
        "style",
        "position: fixed; width: 200px; height: 200px; bottom: -500px; right: -500px; opacity: 0; pointer-events: none; z-index: -9999; border-radius: 8px; overflow: hidden; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);"
      );
      
      const iframePlaceholder = document.createElement("div");
      iframePlaceholder.id = this.elementId;
      container.appendChild(iframePlaceholder);
      
      document.body.appendChild(container);
    }

    this.initPlayer();
  }

  private initPlayer() {
    if ((window as any).YT && (window as any).YT.Player) {
      this.createPlayer();
    } else {
      // Load YouTube Iframe API if not loaded
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const prevCallback = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        this.createPlayer();
      };
    }
  }

  private createPlayer() {
    this.player = new (window as any).YT.Player(this.elementId, {
      height: "100%",
      width: "100%",
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        playsinline: 1,
      },
      events: {
        onReady: () => {
          this.isReady = true;
          this.player.setVolume(this._volume * 100);
          if (this._muted) this.player.mute();
          else this.player.unMute();

          if (this.queuedSrc) {
            this.src = this.queuedSrc;
          }
          if (this.pendingPlay) {
            this.play();
          }
        },
        onStateChange: (event: any) => {
          const state = event.data;
          const YTState = (window as any).YT.PlayerState;

          if (state === YTState.PLAYING) {
            this.trigger("play");
            this.startTimer();
            this._duration = this.player.getDuration() || 0;
            this.trigger("durationchange");
          } else if (state === YTState.PAUSED) {
            this.trigger("pause");
            this.stopTimer();
          } else if (state === YTState.ENDED) {
            this.trigger("ended");
            this.stopTimer();
          }
        },
        onError: (e: any) => {
          console.error("YouTube Player Error:", e.data);
          // If error occurs (e.g. embed restricted/deleted), automatically skip to next track
          this.trigger("ended");
        },
      },
    });
  }

  private startTimer() {
    this.stopTimer();
    this.intervalId = setInterval(() => {
      if (this.isReady && this.player && this.player.getCurrentTime) {
        this._currentTime = this.player.getCurrentTime();
        this.trigger("timeupdate");
      }
    }, 250);
  }

  private stopTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  get src(): string {
    return this.queuedSrc;
  }

  set src(val: string) {
    this.queuedSrc = val;
    if (!val) {
      this.videoId = "";
      if (this.isReady && this.player && this.player.stopVideo) {
        this.player.stopVideo();
      }
      return;
    }

    // Extract videoId from standard URL, Piped streams or direct ID
    let vidId = val;
    const streamMatch = val.match(/\/stream\/([a-zA-Z0-9_-]{11})/);
    if (streamMatch) {
      vidId = streamMatch[1];
    } else {
      const ytMatch = val.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
      );
      if (ytMatch) {
        vidId = ytMatch[1];
      }
    }

    this.videoId = vidId;
    this._currentTime = 0;
    this._duration = 0;

    if (this.isReady && this.player) {
      this.player.cueVideoById({
        videoId: this.videoId,
        startSeconds: 0,
      });
      // Force duration detection
      setTimeout(() => {
        if (this.isReady && this.player && this.player.getDuration) {
          this._duration = this.player.getDuration() || 0;
          this.trigger("durationchange");
        }
      }, 500);
    }
  }

  get currentTime(): number {
    if (this.isReady && this.player && this.player.getCurrentTime) {
      return this.player.getCurrentTime();
    }
    return this._currentTime;
  }

  set currentTime(val: number) {
    this._currentTime = val;
    if (this.isReady && this.player && this.player.seekTo) {
      this.player.seekTo(val, true);
      this.trigger("timeupdate");
    }
  }

  get duration(): number {
    if (this.isReady && this.player && this.player.getDuration) {
      const d = this.player.getDuration();
      if (d > 0) this._duration = d;
    }
    return this._duration;
  }

  get volume(): number {
    return this._volume;
  }

  set volume(val: number) {
    this._volume = val;
    if (this.isReady && this.player && this.player.setVolume) {
      this.player.setVolume(val * 100);
    }
  }

  get muted(): boolean {
    return this._muted;
  }

  set muted(val: boolean) {
    this._muted = val;
    if (this.isReady && this.player) {
      if (val) {
        this.player.mute();
      } else {
        this.player.unMute();
      }
    }
  }

  get paused(): boolean {
    if (this.isReady && this.player && this.player.getPlayerState) {
      const state = this.player.getPlayerState();
      return state !== (window as any).YT.PlayerState.PLAYING;
    }
    return !this.pendingPlay;
  }

  play(): Promise<void> {
    this.pendingPlay = true;
    if (this.isReady && this.player && this.videoId) {
      this.player.playVideo();
      this.pendingPlay = false;
    }
    return Promise.resolve();
  }

  pause(): void {
    this.pendingPlay = false;
    if (this.isReady && this.player) {
      this.player.pauseVideo();
    }
  }

  load(): void {
    // No-op for YouTube Player cueing
  }

  addEventListener(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  removeEventListener(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  private trigger(event: string) {
    const list = this.listeners[event] || [];
    list.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error("Error in player event listener:", err);
      }
    });
  }
}

export function createYouTubeAudioElement(): HTMLAudioElement {
  return new YouTubeAudioElement() as unknown as HTMLAudioElement;
}

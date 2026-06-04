// Helper for global logs accessible by the diagnose UI
function logMsg(msg: string) {
  const formatted = `[YouTubeAudioElement] ${msg}`;
  console.log(formatted);
  if (typeof window !== "undefined") {
    (window as any).youtubePlayerLogs = (window as any).youtubePlayerLogs || [];
    (window as any).youtubePlayerLogs.push(formatted);
    window.dispatchEvent(new CustomEvent("youtube_player_log", { detail: formatted }));
  }
}

class YouTubeAudioElement {
  private player: any = null;
  private isReady: boolean = false;
  private videoId: string = "";
  private pendingPlay: boolean = false;
  private isLoaded: boolean = false;
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
    logMsg("Constructor called.");

    // Create a persistent hidden wrapper div for the iframe if it doesn't exist
    let container = document.getElementById(this.containerId);
    if (!container) {
      logMsg(`Creating container #${this.containerId}`);
      container = document.createElement("div");
      container.id = this.containerId;
      // Absolute positioning offscreen, hidden by default unless transitioned by layout engine
      container.setAttribute(
        "style",
        "position: fixed; width: 200px; height: 200px; top: -1000px; left: -1000px; opacity: 0; pointer-events: none; z-index: -9999; border-radius: 8px; overflow: hidden; transition: opacity 0.3s ease, transform 0.3s ease;"
      );
      
      const iframePlaceholder = document.createElement("div");
      iframePlaceholder.id = this.elementId;
      container.appendChild(iframePlaceholder);
      
      document.body.appendChild(container);
    } else {
      logMsg(`Found existing container #${this.containerId}`);
    }

    this.initPlayer();
  }

  private initPlayer() {
    logMsg("Initializing Player setup...");
    if ((window as any).YT && (window as any).YT.Player) {
      logMsg("YT API already fully loaded. Creating player directly.");
      this.createPlayer();
      return;
    }

    // Polling backup check to prevent initialization race condition or hot-reloading lock
    logMsg("Starting polling check for window.YT.Player...");
    const pollYT = setInterval(() => {
      if ((window as any).YT && (window as any).YT.Player) {
        logMsg("Polling resolved: window.YT.Player is ready. Re-initializing...");
        clearInterval(pollYT);
        this.createPlayer();
      }
    }, 100);

    // Load YouTube Iframe API if not loaded
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      logMsg("YouTube iframe API script tag not found. Loading dynamically...");
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        logMsg("Inserted script tag before first existing script tag.");
      } else {
        document.head.appendChild(tag);
        logMsg("No existing script tags found. Appended script to document head.");
      }
    } else {
      logMsg("YouTube iframe API script tag already present in DOM.");
    }
  }

  private createPlayer() {
    logMsg(`Creating new YT.Player instance on #${this.elementId}...`);
    try {
      const originParam = typeof window !== "undefined" ? window.location.origin : undefined;
      logMsg(`Configuring player origin parameter: ${originParam}`);

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
          origin: originParam,
          modestbranding: 1
        },
        events: {
          onReady: () => {
            logMsg("Player onReady event triggered.");
            this.isReady = true;
            this.player.setVolume(this._volume * 100);
            if (this._muted) {
              logMsg("Muting player on ready state.");
              this.player.mute();
            } else {
              logMsg("Unmuting player on ready state.");
              this.player.unMute();
            }

            if (this.queuedSrc) {
              logMsg(`Loading queued src URL: ${this.queuedSrc}`);
              this.src = this.queuedSrc;
            }
            if (this.pendingPlay) {
              logMsg("Triggering deferred play callback.");
              this.play();
            }
          },
          onStateChange: (event: any) => {
            const state = event.data;
            const YTState = (window as any).YT.PlayerState;
            logMsg(`Player State Change: ${state}`);

            if (state === YTState.PLAYING) {
              logMsg("State = PLAYING. Triggering play event listeners.");
              this.trigger("play");
              this.startTimer();
              this._duration = this.player.getDuration() || 0;
              this.trigger("durationchange");
            } else if (state === YTState.PAUSED) {
              logMsg("State = PAUSED. Triggering pause event listeners.");
              this.trigger("pause");
              this.stopTimer();
            } else if (state === YTState.ENDED) {
              logMsg("State = ENDED. Triggering ended event listeners.");
              this.trigger("ended");
              this.stopTimer();
            } else if (state === YTState.BUFFERING) {
              logMsg("State = BUFFERING.");
            } else if (state === YTState.CUED) {
              logMsg("State = CUED.");
            }
          },
          onError: (e: any) => {
            logMsg(`Player onError event triggered. Error code: ${e.data}`);
            // Error codes:
            // 2 – The request contains an invalid parameter value.
            // 5 – The requested content cannot be played in an HTML5 player.
            // 100 – The video requested was not found (removed or marked private).
            // 101/150 – The owner of the requested video does not allow it to be played in embedded players.
            console.error("YouTube Player Error:", e.data);
            
            // If error occurs, automatically skip to next track
            logMsg("Player error detected. Triggering ended to automatically skip track.");
            this.trigger("ended");
          },
        },
      });
    } catch (err) {
      logMsg(`Error inside createPlayer instantiation: ${err}`);
    }
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
    logMsg(`Setting src URL: "${val}"`);
    this.queuedSrc = val;
    if (!val) {
      logMsg("Empty src. Stopping video.");
      this.videoId = "";
      if (this.isReady && this.player && this.player.stopVideo) {
        this.player.stopVideo();
      }
      return;
    }

    // Extract videoId from standard URL, Piped streams or direct ID
    let vidId = val;
    const streamMatch = val.match(/\/stream\/(?:video\/)?([a-zA-Z0-9_-]{11})/);
    if (streamMatch) {
      vidId = streamMatch[1];
      logMsg(`Matched stream pattern video ID: ${vidId}`);
    } else {
      const ytMatch = val.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
      );
      if (ytMatch) {
        vidId = ytMatch[1];
        logMsg(`Matched standard YouTube pattern video ID: ${vidId}`);
      } else {
        logMsg(`No regex matches. Treating entire src as video ID: ${vidId}`);
      }
    }

    if (this.videoId !== vidId) {
      logMsg(`Changing video ID from "${this.videoId}" to "${vidId}". Resetting currentTime and duration.`);
      this.videoId = vidId;
      this._currentTime = 0;
      this._duration = 0;
      this.isLoaded = false;
    }
  }

  get currentTime(): number {
    if (this.isReady && this.player && this.player.getCurrentTime) {
      return this.player.getCurrentTime();
    }
    return this._currentTime;
  }

  set currentTime(val: number) {
    logMsg(`Setting currentTime: ${val}`);
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
    logMsg(`Setting volume: ${val}`);
    this._volume = val;
    if (this.isReady && this.player && this.player.setVolume) {
      this.player.setVolume(val * 100);
    }
  }

  get muted(): boolean {
    return this._muted;
  }

  set muted(val: boolean) {
    logMsg(`Setting muted: ${val}`);
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
    logMsg(`Play requested. isReady=${this.isReady}, videoId="${this.videoId}", isLoaded=${this.isLoaded}`);
    this.pendingPlay = true;
    if (this.isReady && this.player && this.videoId) {
      if (!this.isLoaded) {
        logMsg(`First-load for video ID: ${this.videoId}. Invoking loadVideoById with offset: ${this._currentTime}`);
        this.player.loadVideoById({
          videoId: this.videoId,
          startSeconds: this._currentTime || 0,
        });
        this.isLoaded = true;

        // Force duration detection on load
        setTimeout(() => {
          if (this.isReady && this.player && this.player.getDuration) {
            this._duration = this.player.getDuration() || 0;
            logMsg(`Late duration detection: ${this._duration}`);
            this.trigger("durationchange");
          }
        }, 800);
      } else {
        logMsg("Video already cued/loaded. Invoking playVideo().");
        this.player.playVideo();
      }
      this.pendingPlay = false;
    } else {
      if (!this.isReady) {
        logMsg("Player not ready yet. Postponing playback trigger.");
      }
      if (!this.videoId) {
        logMsg("Cannot play. Video ID is empty.");
      }
    }
    return Promise.resolve();
  }

  pause(): void {
    logMsg("Pause requested.");
    this.pendingPlay = false;
    if (this.isReady && this.player) {
      this.player.pauseVideo();
    }
  }

  load(): void {
    logMsg("Load requested (No-op in YouTube element).");
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

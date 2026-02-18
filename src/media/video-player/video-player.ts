/**
 * VideoPlayer 视频播放器
 * @module @chips/foundation/media/video-player/video-player
 */

import { ChipsError, ErrorCodes } from '../../core/errors';
import {
  DPlayerVideoEngineAdapter,
  NativeVideoEngineAdapter,
  type VideoEngineAdapter,
} from './video-engine-adapter';
import type {
  VideoEvents,
  VideoPlaybackState,
  VideoPlayerConfig,
  VideoPlayerSnapshot,
  VideoSource,
  VideoSubtitleTrack,
} from './types';

const DEFAULT_PROGRESS_THROTTLE_MS = 2000;

export class VideoPlayer {
  private engine: VideoEngineAdapter | null = null;
  private state: VideoPlaybackState = 'idle';
  private events: VideoEvents = {};
  private disposed = false;
  private readonly initPromise: Promise<void>;
  private subtitleTracks: VideoSubtitleTrack[] = [];
  private currentSubtitleTrackId: string | null = null;
  private unbindHandlers: Array<() => void> = [];
  private saveProgressTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly config: VideoPlayerConfig) {
    this.events = { ...config.events };
    this.subtitleTracks = [...(config.subtitles ?? [])];
    this.initPromise = this.initialize();
  }

  async ready(): Promise<void> {
    await this.initPromise;
  }

  async play(): Promise<void> {
    await this.withEngine(async (engine) => {
      await engine.play();
    });
  }

  async pause(): Promise<void> {
    await this.withEngine((engine) => {
      engine.pause();
    });
  }

  async stop(): Promise<void> {
    await this.withEngine((engine) => {
      engine.pause();
      engine.seek(0);
      this.transitionTo('idle');
    });
  }

  async seek(time: number): Promise<void> {
    this.validateFiniteNumber('time', time);
    await this.withEngine((engine) => {
      engine.seek(time);
    });
  }

  async setSource(source: VideoSource): Promise<void> {
    if (!source.url || typeof source.url !== 'string') {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, 'Video source url is required');
    }

    await this.withEngine(async (engine) => {
      this.transitionTo('loading');
      await engine.setSource(source);
      await this.restoreProgress();
    });
  }

  async setVolume(volume: number): Promise<void> {
    this.validateFiniteNumber('volume', volume);
    await this.withEngine((engine) => {
      engine.setVolume(volume);
    });
  }

  getVolume(): number {
    return this.engine?.getVolume() ?? 0;
  }

  async setMuted(muted: boolean): Promise<void> {
    await this.withEngine((engine) => {
      engine.setMuted(muted);
    });
  }

  isMuted(): boolean {
    return this.engine?.isMuted() ?? false;
  }

  async setPlaybackRate(rate: number): Promise<void> {
    this.validateFiniteNumber('rate', rate);
    await this.withEngine((engine) => {
      engine.setPlaybackRate(rate);
    });
  }

  getPlaybackRate(): number {
    return this.engine?.getPlaybackRate() ?? 1;
  }

  async requestFullscreen(): Promise<void> {
    await this.withEngine(async (engine) => {
      await engine.requestFullscreen();
    });
  }

  async exitFullscreen(): Promise<void> {
    await this.withEngine(async (engine) => {
      await engine.exitFullscreen();
    });
  }

  isFullscreen(): boolean {
    return this.engine?.isFullscreen() ?? false;
  }

  async requestPictureInPicture(): Promise<void> {
    await this.withEngine(async (engine) => {
      const video = engine.videoElement as HTMLVideoElement & {
        requestPictureInPicture?: () => Promise<void>;
      };
      if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    });
  }

  async exitPictureInPicture(): Promise<void> {
    const doc = document as Document & {
      exitPictureInPicture?: () => Promise<void>;
    };

    if (doc.exitPictureInPicture) {
      await doc.exitPictureInPicture();
    }
  }

  getCurrentTime(): number {
    return this.engine?.videoElement.currentTime ?? 0;
  }

  getDuration(): number {
    return this.engine?.videoElement.duration ?? 0;
  }

  getBuffered(): number {
    const ranges = this.engine?.videoElement.buffered;
    if (!ranges || ranges.length === 0) {
      return 0;
    }

    return ranges.end(ranges.length - 1);
  }

  getState(): VideoPlaybackState {
    return this.state;
  }

  getEngineType(): 'dplayer' | 'native' | null {
    return this.engine?.type ?? null;
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.engine?.videoElement ?? null;
  }

  on(events: VideoEvents): void {
    this.events = { ...this.events, ...events };
  }

  loadSubtitles(subtitles: VideoSubtitleTrack[], defaultSubtitleId?: string): void {
    this.subtitleTracks = subtitles;

    if (defaultSubtitleId) {
      this.currentSubtitleTrackId = defaultSubtitleId;
    } else {
      this.currentSubtitleTrackId =
        subtitles.find((track) => track.default)?.id ?? subtitles[0]?.id ?? null;
    }

    this.applySubtitleTracks();
  }

  setSubtitleTrack(trackId: string | null): void {
    this.currentSubtitleTrackId = trackId;
    this.applySubtitleTracks();
    this.events.onSubtitleChange?.(this.getCurrentSubtitleTrack());
  }

  getSubtitleTracks(): VideoSubtitleTrack[] {
    return [...this.subtitleTracks];
  }

  getCurrentSubtitleTrack(): VideoSubtitleTrack | null {
    if (!this.currentSubtitleTrackId) {
      return null;
    }

    return this.subtitleTracks.find((track) => track.id === this.currentSubtitleTrackId) ?? null;
  }

  saveProgress(): void {
    if (!this.engine) {
      return;
    }

    const key = this.resolveProgressStorageKey();
    if (!key) {
      return;
    }

    const currentTime = this.engine.videoElement.currentTime;
    if (!Number.isFinite(currentTime) || currentTime <= 0) {
      return;
    }

    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          time: currentTime,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // 忽略浏览器隐私模式等场景导致的写入失败
    }
  }

  restoreProgress(): Promise<boolean> {
    if (!this.engine) {
      return Promise.resolve(false);
    }

    const key = this.resolveProgressStorageKey();
    if (!key) {
      return Promise.resolve(false);
    }

    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return Promise.resolve(false);
      }

      const parsed = JSON.parse(raw) as { time?: number };
      if (!parsed || !Number.isFinite(parsed.time) || !parsed.time || parsed.time < 0) {
        return Promise.resolve(false);
      }

      this.engine.seek(parsed.time);
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }

  toSnapshot(id: string): VideoPlayerSnapshot {
    const currentSource = this.engine?.videoElement.currentSrc;

    return {
      id,
      engine: this.engine?.type ?? 'native',
      state: this.state,
      sourceUrl: currentSource && currentSource.length > 0 ? currentSource : undefined,
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
      buffered: this.getBuffered(),
      volume: this.getVolume(),
      muted: this.isMuted(),
      playbackRate: this.getPlaybackRate(),
      fullscreen: this.isFullscreen(),
      subtitleTrack: this.getCurrentSubtitleTrack(),
    };
  }

  async destroy(): Promise<void> {
    if (this.disposed) {
      return;
    }

    await this.ready();

    this.disposed = true;
    this.transitionTo('destroyed');

    if (this.saveProgressTimer) {
      clearTimeout(this.saveProgressTimer);
      this.saveProgressTimer = null;
    }

    for (const unbind of this.unbindHandlers) {
      unbind();
    }
    this.unbindHandlers = [];

    this.engine?.destroy();
    this.engine = null;
  }

  private async initialize(): Promise<void> {
    this.transitionTo('loading');

    const preferredEngine = this.config.engine ?? 'dplayer';
    const allowFallback = this.config.allowNativeFallback ?? true;

    if (preferredEngine === 'dplayer') {
      try {
        this.engine = await DPlayerVideoEngineAdapter.create(this.config);
      } catch (error) {
        if (!allowFallback) {
          throw this.wrapUnknownError(error, 'Failed to initialize DPlayer engine');
        }

        const wrapped = this.wrapUnknownError(
          error,
          'DPlayer initialization failed, switched to native engine'
        );
        this.config.onFallback?.('dplayer-unavailable', wrapped);
        this.engine = new NativeVideoEngineAdapter(this.config);
      }
    } else {
      this.engine = new NativeVideoEngineAdapter(this.config);
    }

    this.bindVideoEvents();
    this.applySubtitleTracks();

    if (this.config.source) {
      await this.restoreProgress();
    }

    this.transitionTo('ready');
    this.events.onReady?.();

    if (this.config.autoplay) {
      await this.play();
    }
  }

  private bindVideoEvents(): void {
    if (!this.engine) {
      return;
    }

    const video = this.engine.videoElement;

    const bind = (target: EventTarget, event: string, listener: EventListener): void => {
      target.addEventListener(event, listener);
      this.unbindHandlers.push(() => {
        target.removeEventListener(event, listener);
      });
    };

    bind(video, 'loadstart', () => {
      this.transitionTo('loading');
    });

    bind(video, 'loadedmetadata', () => {
      if (this.state !== 'playing') {
        this.transitionTo('ready');
      }
    });

    bind(video, 'play', () => {
      this.transitionTo('playing');
      this.events.onPlay?.();
    });

    bind(video, 'pause', () => {
      if (this.state !== 'idle' && this.state !== 'ended') {
        this.transitionTo('paused');
      }
      this.events.onPause?.();
    });

    bind(video, 'ended', () => {
      this.transitionTo('ended');
      this.saveProgress();
      this.events.onEnded?.();
    });

    bind(video, 'timeupdate', () => {
      this.events.onTimeUpdate?.(video.currentTime, video.duration || 0);
      this.scheduleProgressSave();
    });

    bind(video, 'progress', () => {
      this.events.onProgress?.(this.getBuffered());
    });

    bind(video, 'volumechange', () => {
      this.events.onVolumeChange?.(video.volume, video.muted);
    });

    bind(video, 'ratechange', () => {
      this.events.onRateChange?.(video.playbackRate);
    });

    bind(video, 'error', () => {
      this.transitionTo('error');
      const mediaErrorCode = video.error?.code;
      const error = new ChipsError(
        ErrorCodes.RESOURCE_UNAVAILABLE,
        `Video playback error${typeof mediaErrorCode === 'number' ? ` (code: ${mediaErrorCode})` : ''}`
      );
      this.events.onError?.(error);
    });

    bind(document, 'fullscreenchange', () => {
      this.events.onFullscreenChange?.(this.isFullscreen());
    });
  }

  private applySubtitleTracks(): void {
    if (!this.engine) {
      return;
    }

    const video = this.engine.videoElement;
    const existingTracks = Array.from(video.querySelectorAll('track[data-chips-subtitle="1"]'));
    for (const track of existingTracks) {
      track.remove();
    }

    for (const track of this.subtitleTracks) {
      const element = document.createElement('track');
      element.dataset.chipsSubtitle = '1';
      element.kind = track.kind ?? 'subtitles';
      element.label = track.label;
      element.srclang = track.language;
      element.src = track.src;
      element.default = track.id === this.currentSubtitleTrackId;
      video.appendChild(element);
    }

    const textTracks = Array.from(video.textTracks);
    for (const textTrack of textTracks) {
      const match = this.subtitleTracks.find(
        (candidate) =>
          candidate.label === textTrack.label && candidate.language === textTrack.language
      );

      textTrack.mode = match && match.id === this.currentSubtitleTrackId ? 'showing' : 'disabled';
    }
  }

  private scheduleProgressSave(): void {
    if (this.saveProgressTimer) {
      return;
    }

    this.saveProgressTimer = setTimeout(() => {
      this.saveProgressTimer = null;
      this.saveProgress();
    }, this.config.progressSaveThrottleMs ?? DEFAULT_PROGRESS_THROTTLE_MS);
  }

  private resolveProgressStorageKey(): string | null {
    if (this.config.progressStorageKey) {
      return this.config.progressStorageKey;
    }

    const currentSource = this.engine?.videoElement.currentSrc;
    const sourceUrl =
      currentSource && currentSource.length > 0 ? currentSource : this.config.source?.url;
    if (!sourceUrl) {
      return null;
    }

    return `chips.video.progress:${sourceUrl}`;
  }

  private transitionTo(nextState: VideoPlaybackState): void {
    if (this.state === nextState) {
      return;
    }

    this.state = nextState;
    this.events.onStateChange?.(nextState);
  }

  private async withEngine(
    handler: (engine: VideoEngineAdapter) => void | Promise<void>
  ): Promise<void> {
    if (this.disposed) {
      throw new ChipsError(ErrorCodes.RESOURCE_UNAVAILABLE, 'VideoPlayer has been destroyed');
    }

    await this.ready();

    if (!this.engine) {
      throw new ChipsError(ErrorCodes.RESOURCE_UNAVAILABLE, 'Video engine is unavailable');
    }

    try {
      await handler(this.engine);
    } catch (error) {
      const wrapped = this.wrapUnknownError(error, 'Video operation failed');
      this.events.onError?.(wrapped);
      throw wrapped;
    }
  }

  private validateFiniteNumber(field: string, value: number): void {
    if (!Number.isFinite(value)) {
      throw new ChipsError(ErrorCodes.INVALID_INPUT, `${field} must be a finite number`);
    }
  }

  private wrapUnknownError(error: unknown, fallbackMessage: string): ChipsError {
    if (error instanceof ChipsError) {
      return error;
    }

    if (error instanceof Error) {
      return new ChipsError(ErrorCodes.INTERNAL_ERROR, error.message, undefined, error);
    }

    return new ChipsError(ErrorCodes.INTERNAL_ERROR, fallbackMessage, { error });
  }
}

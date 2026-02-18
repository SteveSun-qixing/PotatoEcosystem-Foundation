/**
 * VideoPlayer 播放引擎适配层
 * @module @chips/foundation/media/video-player/video-engine-adapter
 */

import { ChipsError, ErrorCodes } from '../../core/errors';
import type { VideoEngineType, VideoPlayerConfig, VideoSource, VideoSubtitleTrack } from './types';

export interface VideoEngineAdapter {
  readonly type: VideoEngineType;
  readonly videoElement: HTMLVideoElement;
  play(): Promise<void>;
  pause(): void;
  seek(time: number): void;
  setSource(source: VideoSource): Promise<void>;
  setVolume(volume: number): void;
  getVolume(): number;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  requestFullscreen(): Promise<void>;
  exitFullscreen(): Promise<void>;
  isFullscreen(): boolean;
  destroy(): void;
}

interface DPlayerVideoConfig {
  url: string;
  type?: string;
  pic?: string;
  thumbnails?: string;
  quality?: Array<{ name: string; url: string; type?: string }>;
  defaultQuality?: number;
  customType?: Record<string, (videoElement: HTMLVideoElement, player: unknown) => void>;
}

interface DPlayerSubtitleConfig {
  url: string;
  type?: string;
  lang?: string;
  color?: string;
  bottom?: string;
  fontSize?: string;
}

interface DPlayerOptions {
  container: HTMLElement;
  autoplay?: boolean;
  loop?: boolean;
  volume?: number;
  preload?: 'none' | 'metadata' | 'auto';
  screenshot?: boolean;
  hotkey?: boolean;
  mutex?: boolean;
  theme?: string;
  lang?: string;
  playbackSpeed?: number[];
  video: DPlayerVideoConfig;
  subtitle?: DPlayerSubtitleConfig;
}

interface DPlayerFullscreenApi {
  request(type?: 'browser' | 'web'): void;
  cancel(type?: 'browser' | 'web'): void;
  isFullScreen(type?: 'browser' | 'web'): boolean;
}

interface DPlayerLike {
  readonly video: HTMLVideoElement;
  readonly fullScreen: DPlayerFullscreenApi;
  play(): Promise<void>;
  pause(): void;
  seek(time: number): void;
  speed(rate: number): void;
  volume(percentage: number, noStorage?: boolean, noNotice?: boolean): void;
  switchVideo(video: DPlayerVideoConfig): void;
  destroy(): void;
}

interface DPlayerConstructor {
  new (options: DPlayerOptions): DPlayerLike;
}

interface DPlayerGlobalScope {
  DPlayer?: DPlayerConstructor;
  self?: DPlayerGlobalScope;
}

let cachedDPlayerCtor: DPlayerConstructor | null = null;
let loadingPromise: Promise<DPlayerConstructor> | null = null;

async function loadDPlayerCtor(): Promise<DPlayerConstructor> {
  if (cachedDPlayerCtor) {
    return cachedDPlayerCtor;
  }

  const globalScope = globalThis as unknown as DPlayerGlobalScope;

  if (!globalScope.self) {
    globalScope.self = globalScope;
  }

  if (globalScope.DPlayer) {
    cachedDPlayerCtor = globalScope.DPlayer;
    return cachedDPlayerCtor;
  }

  if (!loadingPromise) {
    loadingPromise = import('./vendor/DPlayer.cjs')
      .then((module) => {
        const defaultCtor = (module as { default?: DPlayerConstructor }).default;
        const ctor = globalScope.DPlayer ?? defaultCtor;

        if (!ctor) {
          throw new ChipsError(ErrorCodes.MODULE_LOAD_ERROR, 'Failed to load DPlayer constructor');
        }

        cachedDPlayerCtor = ctor;
        return ctor;
      })
      .finally(() => {
        loadingPromise = null;
      });
  }

  return loadingPromise;
}

function toDPlayerVideoConfig(source: VideoSource): DPlayerVideoConfig {
  return {
    url: source.url,
    type: source.type,
    pic: source.poster,
    thumbnails: source.thumbnails,
    quality: source.quality,
    defaultQuality: source.defaultQuality,
    customType: source.customType,
  };
}

function toDPlayerSubtitleConfig(
  track: VideoSubtitleTrack | undefined
): DPlayerSubtitleConfig | undefined {
  if (!track) {
    return undefined;
  }

  return {
    url: track.src,
    type: 'webvtt',
    lang: track.language,
  };
}

function normalizeDPlayerLanguage(language: string | undefined): string {
  if (!language || typeof language !== 'string') {
    return 'zh-cn';
  }

  const normalized = language.trim().toLowerCase().replace('_', '-');
  if (!normalized) {
    return 'zh-cn';
  }

  if (normalized.startsWith('zh-tw') || normalized.startsWith('zh-hk') || normalized.includes('hant')) {
    return 'zh-tw';
  }

  if (normalized.startsWith('zh')) {
    return 'zh-cn';
  }

  if (normalized.startsWith('en')) {
    return 'en';
  }

  return 'en';
}

export class NativeVideoEngineAdapter implements VideoEngineAdapter {
  readonly type: VideoEngineType = 'native';
  readonly videoElement: HTMLVideoElement;

  constructor(private readonly config: VideoPlayerConfig) {
    this.videoElement = document.createElement('video');
    this.videoElement.style.width = '100%';
    this.videoElement.style.height = '100%';
    this.videoElement.controls = config.controls ?? true;
    this.videoElement.autoplay = config.autoplay ?? false;
    this.videoElement.loop = config.loop ?? false;
    this.videoElement.muted = config.muted ?? false;
    this.videoElement.preload = config.preload ?? 'metadata';

    if (typeof config.volume === 'number') {
      this.videoElement.volume = clamp(config.volume, 0, 1);
    }

    if (typeof config.playbackRate === 'number') {
      this.videoElement.playbackRate = clamp(config.playbackRate, 0.25, 4);
    }

    if (config.source) {
      this.videoElement.src = config.source.url;
      if (config.source.poster) {
        this.videoElement.poster = config.source.poster;
      }
    }

    config.container.appendChild(this.videoElement);
  }

  async play(): Promise<void> {
    await this.videoElement.play();
  }

  pause(): void {
    this.videoElement.pause();
  }

  seek(time: number): void {
    const target = Number.isFinite(time) ? time : 0;
    this.videoElement.currentTime = Math.max(
      0,
      Math.min(target, this.videoElement.duration || Number.MAX_SAFE_INTEGER)
    );
  }

  setSource(source: VideoSource): Promise<void> {
    this.videoElement.src = source.url;
    this.videoElement.poster = source.poster ?? '';
    this.videoElement.load();
    return Promise.resolve();
  }

  setVolume(volume: number): void {
    this.videoElement.volume = clamp(volume, 0, 1);
  }

  getVolume(): number {
    return this.videoElement.volume;
  }

  setMuted(muted: boolean): void {
    this.videoElement.muted = muted;
  }

  isMuted(): boolean {
    return this.videoElement.muted;
  }

  setPlaybackRate(rate: number): void {
    this.videoElement.playbackRate = clamp(rate, 0.25, 4);
  }

  getPlaybackRate(): number {
    return this.videoElement.playbackRate;
  }

  async requestFullscreen(): Promise<void> {
    if (this.videoElement.requestFullscreen) {
      await this.videoElement.requestFullscreen();
    }
  }

  async exitFullscreen(): Promise<void> {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  }

  isFullscreen(): boolean {
    return (
      document.fullscreenElement === this.videoElement ||
      document.fullscreenElement === this.config.container
    );
  }

  destroy(): void {
    this.videoElement.pause();
    this.videoElement.remove();
  }
}

export class DPlayerVideoEngineAdapter implements VideoEngineAdapter {
  readonly type: VideoEngineType = 'dplayer';
  readonly videoElement: HTMLVideoElement;

  private constructor(private readonly player: DPlayerLike) {
    this.videoElement = player.video;
  }

  static async create(config: VideoPlayerConfig): Promise<DPlayerVideoEngineAdapter> {
    if (!canUseDOM()) {
      throw new ChipsError(
        ErrorCodes.RESOURCE_UNAVAILABLE,
        'DPlayer requires a browser DOM environment'
      );
    }

    const Ctor = await loadDPlayerCtor();
    const defaultTrack = pickDefaultSubtitleTrack(config.subtitles, config.defaultSubtitleId);

    const player = new Ctor({
      container: config.container,
      autoplay: config.autoplay ?? false,
      loop: config.loop ?? false,
      volume: config.volume,
      preload: config.preload ?? 'metadata',
      screenshot: config.screenshot ?? false,
      hotkey: config.hotkey ?? true,
      mutex: config.mutex ?? true,
      theme: config.themeColor ?? '#b7daff',
      lang: normalizeDPlayerLanguage(config.language),
      playbackSpeed: config.playbackRates,
      video: toDPlayerVideoConfig(config.source ?? { url: '' }),
      subtitle: toDPlayerSubtitleConfig(defaultTrack),
    });

    if (typeof config.playbackRate === 'number') {
      player.speed(clamp(config.playbackRate, 0.25, 4));
    }

    if (typeof config.muted === 'boolean') {
      player.video.muted = config.muted;
    }

    return new DPlayerVideoEngineAdapter(player);
  }

  async play(): Promise<void> {
    await this.player.play();
  }

  pause(): void {
    this.player.pause();
  }

  seek(time: number): void {
    this.player.seek(Math.max(0, Number.isFinite(time) ? time : 0));
  }

  setSource(source: VideoSource): Promise<void> {
    this.player.switchVideo(toDPlayerVideoConfig(source));
    return Promise.resolve();
  }

  setVolume(volume: number): void {
    this.player.volume(clamp(volume, 0, 1), true, true);
  }

  getVolume(): number {
    return this.videoElement.volume;
  }

  setMuted(muted: boolean): void {
    this.videoElement.muted = muted;
  }

  isMuted(): boolean {
    return this.videoElement.muted;
  }

  setPlaybackRate(rate: number): void {
    this.player.speed(clamp(rate, 0.25, 4));
  }

  getPlaybackRate(): number {
    return this.videoElement.playbackRate;
  }

  requestFullscreen(): Promise<void> {
    this.player.fullScreen.request('browser');
    return Promise.resolve();
  }

  exitFullscreen(): Promise<void> {
    this.player.fullScreen.cancel('browser');
    return Promise.resolve();
  }

  isFullscreen(): boolean {
    return (
      this.player.fullScreen.isFullScreen('browser') || this.player.fullScreen.isFullScreen('web')
    );
  }

  destroy(): void {
    this.player.destroy();
  }
}

function pickDefaultSubtitleTrack(
  tracks: VideoSubtitleTrack[] | undefined,
  defaultId: string | undefined
): VideoSubtitleTrack | undefined {
  if (!tracks?.length) {
    return undefined;
  }

  if (defaultId) {
    const matched = tracks.find((track) => track.id === defaultId);
    if (matched) {
      return matched;
    }
  }

  return tracks.find((track) => track.default) ?? tracks[0];
}

function canUseDOM(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

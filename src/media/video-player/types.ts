/**
 * VideoPlayer 类型定义
 * @module @chips/foundation/media/video-player/types
 */

export type VideoEngineType = 'dplayer' | 'native';

export type VideoPlaybackState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error'
  | 'destroyed';

export type VideoSourceType = 'auto' | 'normal' | 'hls' | 'flv' | 'dash' | 'webtorrent' | 'custom';

export interface VideoSourceQuality {
  name: string;
  url: string;
  type?: VideoSourceType;
}

export interface VideoSource {
  url: string;
  type?: VideoSourceType;
  poster?: string;
  thumbnails?: string;
  quality?: VideoSourceQuality[];
  defaultQuality?: number;
  customType?: Record<string, (videoElement: HTMLVideoElement, player: unknown) => void>;
}

export interface VideoSubtitleTrack {
  id: string;
  src: string;
  language: string;
  label: string;
  default?: boolean;
  kind?: 'subtitles' | 'captions';
}

export interface VideoEvents {
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onProgress?: (buffered: number) => void;
  onVolumeChange?: (volume: number, muted: boolean) => void;
  onRateChange?: (rate: number) => void;
  onSubtitleChange?: (track: VideoSubtitleTrack | null) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onStateChange?: (state: VideoPlaybackState) => void;
  onError?: (error: Error) => void;
}

export interface VideoPlayerConfig {
  container: HTMLElement;
  source?: VideoSource;
  subtitles?: VideoSubtitleTrack[];
  defaultSubtitleId?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  volume?: number;
  playbackRate?: number;
  playbackRates?: number[];
  preload?: 'none' | 'metadata' | 'auto';
  screenshot?: boolean;
  hotkey?: boolean;
  mutex?: boolean;
  themeColor?: string;
  language?: 'en' | 'zh-cn' | 'zh-tw';
  engine?: VideoEngineType;
  progressStorageKey?: string;
  progressSaveThrottleMs?: number;
  allowNativeFallback?: boolean;
  onFallback?: (reason: string, error?: Error) => void;
  events?: VideoEvents;
}

export interface VideoPlayerSnapshot {
  id: string;
  engine: VideoEngineType;
  state: VideoPlaybackState;
  sourceUrl?: string;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  fullscreen: boolean;
  subtitleTrack: VideoSubtitleTrack | null;
}

export interface VideoManagerActionPayloadMap {
  create: {
    config: VideoPlayerConfig;
  };
  play: {
    playerId: string;
  };
  pause: {
    playerId: string;
  };
  stop: {
    playerId: string;
  };
  seek: {
    playerId: string;
    time: number;
  };
  setVolume: {
    playerId: string;
    volume: number;
  };
  setMuted: {
    playerId: string;
    muted: boolean;
  };
  setPlaybackRate: {
    playerId: string;
    rate: number;
  };
  setSource: {
    playerId: string;
    source: VideoSource;
  };
  loadSubtitles: {
    playerId: string;
    subtitles: VideoSubtitleTrack[];
    defaultSubtitleId?: string;
  };
  setSubtitleTrack: {
    playerId: string;
    trackId: string | null;
  };
  saveProgress: {
    playerId: string;
  };
  restoreProgress: {
    playerId: string;
  };
  getSnapshot: {
    playerId: string;
  };
  destroy: {
    playerId: string;
  };
  destroyAll: Record<string, never>;
}

export type VideoManagerAction = keyof VideoManagerActionPayloadMap;

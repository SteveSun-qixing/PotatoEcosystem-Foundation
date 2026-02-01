/**
 * VideoPlayer 视频播放器
 * @module @chips/foundation/media/video-player/video-player
 */

/**
 * 播放状态
 */
export type VideoPlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

/**
 * 视频播放器配置
 */
export interface VideoPlayerConfig {
  /** 容器 */
  container: HTMLElement;
  /** 视频源 */
  src?: string;
  /** 是否自动播放 */
  autoplay?: boolean;
  /** 是否循环 */
  loop?: boolean;
  /** 初始音量 */
  volume?: number;
  /** 是否显示控件 */
  controls?: boolean;
  /** 海报图 */
  poster?: string;
}

/**
 * 视频事件
 */
export interface VideoEvents {
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onProgress?: (buffered: number) => void;
  onError?: (error: Error) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

/**
 * VideoPlayer 视频播放器
 */
export class VideoPlayer {
  private container: HTMLElement;
  private video: HTMLVideoElement;
  private state: VideoPlaybackState = 'idle';
  private events: VideoEvents = {};

  constructor(config: VideoPlayerConfig) {
    this.container = config.container;

    this.video = document.createElement('video');
    this.video.style.width = '100%';
    this.video.style.height = '100%';

    if (config.src) {
      this.video.src = config.src;
    }

    this.video.autoplay = config.autoplay ?? false;
    this.video.loop = config.loop ?? false;
    this.video.volume = config.volume ?? 1;
    this.video.controls = config.controls ?? false;

    if (config.poster) {
      this.video.poster = config.poster;
    }

    this.container.appendChild(this.video);
    this.setupEvents();
  }

  /**
   * 播放
   */
  async play(): Promise<void> {
    try {
      await this.video.play();
    } catch (error) {
      this.events.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * 暂停
   */
  pause(): void {
    this.video.pause();
  }

  /**
   * 停止
   */
  stop(): void {
    this.video.pause();
    this.video.currentTime = 0;
    this.state = 'idle';
  }

  /**
   * 跳转
   */
  seek(time: number): void {
    this.video.currentTime = Math.max(0, Math.min(time, this.video.duration || 0));
  }

  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    this.video.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 获取音量
   */
  getVolume(): number {
    return this.video.volume;
  }

  /**
   * 静音/取消静音
   */
  toggleMute(): void {
    this.video.muted = !this.video.muted;
  }

  /**
   * 是否静音
   */
  isMuted(): boolean {
    return this.video.muted;
  }

  /**
   * 获取当前时间
   */
  getCurrentTime(): number {
    return this.video.currentTime;
  }

  /**
   * 获取时长
   */
  getDuration(): number {
    return this.video.duration || 0;
  }

  /**
   * 获取播放状态
   */
  getState(): VideoPlaybackState {
    return this.state;
  }

  /**
   * 设置播放速度
   */
  setPlaybackRate(rate: number): void {
    this.video.playbackRate = rate;
  }

  /**
   * 获取播放速度
   */
  getPlaybackRate(): number {
    return this.video.playbackRate;
  }

  /**
   * 进入全屏
   */
  async enterFullscreen(): Promise<void> {
    if (this.video.requestFullscreen) {
      await this.video.requestFullscreen();
    }
  }

  /**
   * 退出全屏
   */
  async exitFullscreen(): Promise<void> {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
  }

  /**
   * 是否全屏
   */
  isFullscreen(): boolean {
    return document.fullscreenElement === this.video;
  }

  /**
   * 进入画中画
   */
  async enterPictureInPicture(): Promise<void> {
    if ('requestPictureInPicture' in this.video) {
      await this.video.requestPictureInPicture();
    }
  }

  /**
   * 设置视频源
   */
  setSrc(src: string): void {
    this.video.src = src;
    this.state = 'idle';
  }

  /**
   * 绑定事件
   */
  on(events: VideoEvents): void {
    this.events = { ...this.events, ...events };
  }

  /**
   * 获取视频元素
   */
  getElement(): HTMLVideoElement {
    return this.video;
  }

  /**
   * 设置事件
   */
  private setupEvents(): void {
    this.video.addEventListener('loadstart', () => {
      this.state = 'loading';
    });

    this.video.addEventListener('play', () => {
      this.state = 'playing';
      this.events.onPlay?.();
    });

    this.video.addEventListener('pause', () => {
      if (this.state !== 'idle') {
        this.state = 'paused';
        this.events.onPause?.();
      }
    });

    this.video.addEventListener('ended', () => {
      this.state = 'ended';
      this.events.onEnded?.();
    });

    this.video.addEventListener('timeupdate', () => {
      this.events.onTimeUpdate?.(this.video.currentTime, this.video.duration);
    });

    this.video.addEventListener('progress', () => {
      if (this.video.buffered.length > 0) {
        const buffered = this.video.buffered.end(this.video.buffered.length - 1);
        this.events.onProgress?.(buffered);
      }
    });

    this.video.addEventListener('error', () => {
      this.state = 'error';
      this.events.onError?.(new Error('Video playback error'));
    });

    document.addEventListener('fullscreenchange', () => {
      this.events.onFullscreenChange?.(this.isFullscreen());
    });
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.stop();
    this.video.remove();
  }
}

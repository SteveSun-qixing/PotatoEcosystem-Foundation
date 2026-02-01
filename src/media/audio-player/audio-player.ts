/**
 * AudioPlayer 音频播放器
 * @module @chips/foundation/media/audio-player/audio-player
 */

/**
 * 播放状态
 */
export type PlaybackState = 'idle' | 'playing' | 'paused' | 'ended';

/**
 * 音频播放器配置
 */
export interface AudioPlayerConfig {
  /** 音频源 */
  src?: string;
  /** 是否自动播放 */
  autoplay?: boolean;
  /** 是否循环 */
  loop?: boolean;
  /** 初始音量 (0-1) */
  volume?: number;
}

/**
 * 播放事件
 */
export interface PlaybackEvents {
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onError?: (error: Error) => void;
}

/**
 * AudioPlayer 音频播放器
 */
export class AudioPlayer {
  private audio: HTMLAudioElement;
  private state: PlaybackState = 'idle';
  private events: PlaybackEvents = {};

  constructor(config?: AudioPlayerConfig) {
    this.audio = new Audio();

    if (config?.src) {
      this.audio.src = config.src;
    }

    this.audio.autoplay = config?.autoplay ?? false;
    this.audio.loop = config?.loop ?? false;
    this.audio.volume = config?.volume ?? 1;

    this.setupEvents();
  }

  /**
   * 播放
   */
  async play(): Promise<void> {
    try {
      await this.audio.play();
      this.state = 'playing';
    } catch (error) {
      this.events.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * 暂停
   */
  pause(): void {
    this.audio.pause();
    this.state = 'paused';
  }

  /**
   * 停止
   */
  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.state = 'idle';
  }

  /**
   * 跳转
   */
  seek(time: number): void {
    this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration || 0));
  }

  /**
   * 设置音量
   */
  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 获取音量
   */
  getVolume(): number {
    return this.audio.volume;
  }

  /**
   * 静音
   */
  mute(): void {
    this.audio.muted = true;
  }

  /**
   * 取消静音
   */
  unmute(): void {
    this.audio.muted = false;
  }

  /**
   * 是否静音
   */
  isMuted(): boolean {
    return this.audio.muted;
  }

  /**
   * 获取当前时间
   */
  getCurrentTime(): number {
    return this.audio.currentTime;
  }

  /**
   * 获取时长
   */
  getDuration(): number {
    return this.audio.duration || 0;
  }

  /**
   * 获取播放状态
   */
  getState(): PlaybackState {
    return this.state;
  }

  /**
   * 设置音频源
   */
  setSrc(src: string): void {
    this.audio.src = src;
    this.state = 'idle';
  }

  /**
   * 设置循环
   */
  setLoop(loop: boolean): void {
    this.audio.loop = loop;
  }

  /**
   * 绑定事件
   */
  on(events: PlaybackEvents): void {
    this.events = { ...this.events, ...events };
  }

  /**
   * 设置事件
   */
  private setupEvents(): void {
    this.audio.addEventListener('play', () => {
      this.state = 'playing';
      this.events.onPlay?.();
    });

    this.audio.addEventListener('pause', () => {
      if (this.state !== 'idle') {
        this.state = 'paused';
        this.events.onPause?.();
      }
    });

    this.audio.addEventListener('ended', () => {
      this.state = 'ended';
      this.events.onEnded?.();
    });

    this.audio.addEventListener('timeupdate', () => {
      this.events.onTimeUpdate?.(this.audio.currentTime, this.audio.duration);
    });

    this.audio.addEventListener('error', () => {
      this.events.onError?.(new Error('Audio playback error'));
    });
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.stop();
    this.audio.src = '';
  }
}

/**
 * @vitest-environment jsdom
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { VideoPlayerManager } from '../../src/media/video-player/video-player-manager';

function mockMediaElementPlayback(): void {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn(async function play(this: HTMLMediaElement) {
      this.dispatchEvent(new Event('play'));
    }),
  });

  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(function pause(this: HTMLMediaElement) {
      this.dispatchEvent(new Event('pause'));
    }),
  });

  Object.defineProperty(HTMLMediaElement.prototype, 'load', {
    configurable: true,
    value: vi.fn(),
  });
}

function mockLocalStorage(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  });
}

describe('VideoPlayerManager', () => {
  let manager: VideoPlayerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    mockLocalStorage();
    localStorage.clear();
    mockMediaElementPlayback();
    manager = new VideoPlayerManager();
  });

  afterEach(async () => {
    if (manager) {
      await manager.destroyAll();
    }
    vi.unstubAllGlobals();
  });

  it('should create and control a native player instance', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const playerId = await manager.create({
      container,
      source: { url: 'https://example.com/demo.mp4' },
      engine: 'native',
      controls: true,
      volume: 0.4,
    });

    expect(playerId).toHaveLength(10);

    const player = manager.get(playerId);
    expect(player).toBeDefined();

    await player?.play();
    expect(player?.getState()).toBe('playing');

    await player?.setVolume(0.8);
    expect(player?.getVolume()).toBeCloseTo(0.8, 5);

    await player?.setMuted(true);
    expect(player?.isMuted()).toBe(true);

    await player?.setPlaybackRate(1.5);
    expect(player?.getPlaybackRate()).toBeCloseTo(1.5, 5);

    await player?.seek(12);
    expect(player?.getCurrentTime()).toBeCloseTo(12, 5);
  });

  it('should support service dispatch and snapshot query', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const createResponse = await manager.dispatch('create', {
      config: {
        container,
        source: { url: 'https://example.com/video.mp4' },
        engine: 'native',
      },
    });

    const playerId = (createResponse as { playerId: string }).playerId;

    await manager.dispatch('play', { playerId });

    const snapshot = await manager.dispatch('getSnapshot', { playerId });
    const resolved = snapshot as { state: string; id: string; sourceUrl?: string };

    expect(resolved.id).toBe(playerId);
    expect(resolved.state).toBe('playing');
    expect(
      typeof resolved.sourceUrl === 'undefined' || resolved.sourceUrl.includes('video.mp4')
    ).toBe(true);

    const response = await manager.handleRequest({
      target: 'VideoPlayerManager',
      action: 'media.video.pause',
      params: { playerId },
      requestId: 'req-001',
      timestamp: Date.now(),
    });

    expect(response.success).toBe(true);
    expect(response.requestId).toBe('req-001');
  });

  it('should persist and restore playback progress', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const playerId = await manager.create({
      container,
      source: { url: 'https://example.com/progress.mp4' },
      engine: 'native',
      progressStorageKey: 'test.progress.key',
    });

    const player = manager.get(playerId);
    const element = player?.getVideoElement();
    expect(element).toBeTruthy();

    if (!element || !player) {
      throw new Error('Player element not created');
    }

    element.currentTime = 42;
    player.saveProgress();

    element.currentTime = 0;
    const restored = await player.restoreProgress();

    expect(restored).toBe(true);
    expect(player.getCurrentTime()).toBeCloseTo(42, 5);
  });

  it('should destroy players and reject unknown player actions', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const playerId = await manager.create({
      container,
      source: { url: 'https://example.com/remove.mp4' },
      engine: 'native',
    });

    const destroyed = await manager.destroy(playerId);
    expect(destroyed).toBe(true);
    expect(manager.has(playerId)).toBe(false);

    await expect(manager.dispatch('pause', { playerId })).rejects.toThrowError(/not found/i);
  });
});

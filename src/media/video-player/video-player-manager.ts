/**
 * VideoPlayerManager 视频播放器管理器
 * @module @chips/foundation/media/video-player/video-player-manager
 */

import { ChipsError, ErrorCodes } from '../../core/errors';
import { generateId } from '../../core/utils/id-generator';
import type { CoreRequest, CoreResponse } from '../../core/types';
import type { IServiceProvider } from '../../core/interfaces';
import { VideoPlayer } from './video-player';
import type {
  VideoManagerAction,
  VideoManagerActionPayloadMap,
  VideoPlayerConfig,
  VideoPlayerSnapshot,
} from './types';

const VIDEO_MANAGER_SERVICE_PREFIX = 'media.video';

export class VideoPlayerManager implements IServiceProvider {
  private readonly players = new Map<string, VideoPlayer>();

  async create(config: VideoPlayerConfig): Promise<string> {
    const playerId = generateId();
    const player = new VideoPlayer(config);
    this.players.set(playerId, player);

    try {
      await player.ready();
    } catch (error) {
      this.players.delete(playerId);
      throw this.wrapUnknownError(error, `Failed to initialize player: ${playerId}`);
    }

    return playerId;
  }

  get(playerId: string): VideoPlayer | undefined {
    return this.players.get(playerId);
  }

  has(playerId: string): boolean {
    return this.players.has(playerId);
  }

  async destroy(playerId: string): Promise<boolean> {
    const player = this.players.get(playerId);
    if (!player) {
      return false;
    }

    await player.destroy();
    this.players.delete(playerId);
    return true;
  }

  async destroyAll(): Promise<void> {
    const players = Array.from(this.players.entries());

    for (const [playerId, player] of players) {
      await player.destroy();
      this.players.delete(playerId);
    }
  }

  getSnapshot(playerId: string): VideoPlayerSnapshot {
    const player = this.requirePlayer(playerId);
    return player.toSnapshot(playerId);
  }

  listSnapshots(): VideoPlayerSnapshot[] {
    return Array.from(this.players.entries()).map(([playerId, player]) =>
      player.toSnapshot(playerId)
    );
  }

  getSupportedServices(): string[] {
    return [
      `${VIDEO_MANAGER_SERVICE_PREFIX}.create`,
      `${VIDEO_MANAGER_SERVICE_PREFIX}.play`,
      `${VIDEO_MANAGER_SERVICE_PREFIX}.pause`,
      `${VIDEO_MANAGER_SERVICE_PREFIX}.stop`,
      `${VIDEO_MANAGER_SERVICE_PREFIX}.seek`,
      `${VIDEO_MANAGER_SERVICE_PREFIX}.setVolume`,
      `${VIDEO_MANAGER_SERVICE_PREFIX}.setMuted`,
      `${VIDEO_MANAGER_SERVICE_PREFIX}.setPlaybackRate`,
      `${VIDEO_MANAGER_SERVICE_PREFIX}.setSource`,
      `${VIDEO_MANAGER_SERVICE_PREFIX}.loadSubtitles`,
      `${VIDEO_MANAGER_SERVICE_PREFIX}.setSubtitleTrack`,
      `${VIDEO_MANAGER_SERVICE_PREFIX}.saveProgress`,
      `${VIDEO_MANAGER_SERVICE_PREFIX}.restoreProgress`,
      `${VIDEO_MANAGER_SERVICE_PREFIX}.getSnapshot`,
      `${VIDEO_MANAGER_SERVICE_PREFIX}.destroy`,
      `${VIDEO_MANAGER_SERVICE_PREFIX}.destroyAll`,
    ];
  }

  async handleRequest<T, R>(request: CoreRequest<T>): Promise<CoreResponse<R>> {
    const requestId = request.requestId;

    try {
      const action = this.resolveAction(request.action);
      const payload = request.params as VideoManagerActionPayloadMap[VideoManagerAction];
      const data = await this.dispatch(action, payload);

      return {
        success: true,
        data: data as R,
        requestId,
        timestamp: Date.now(),
      };
    } catch (error) {
      const wrapped = this.wrapUnknownError(error, 'Video manager request failed');

      return {
        success: false,
        error: {
          code: wrapped.code,
          message: wrapped.message,
          details: wrapped.details,
        },
        requestId,
        timestamp: Date.now(),
      };
    }
  }

  async dispatch(
    action: VideoManagerAction,
    payload: VideoManagerActionPayloadMap[VideoManagerAction]
  ): Promise<unknown> {
    switch (action) {
      case 'create': {
        const request = payload as VideoManagerActionPayloadMap['create'];
        const playerId = await this.create(request.config);
        return { playerId };
      }

      case 'play': {
        const request = payload as VideoManagerActionPayloadMap['play'];
        const player = this.requirePlayer(request.playerId);
        await player.play();
        return { success: true };
      }

      case 'pause': {
        const request = payload as VideoManagerActionPayloadMap['pause'];
        const player = this.requirePlayer(request.playerId);
        await player.pause();
        return { success: true };
      }

      case 'stop': {
        const request = payload as VideoManagerActionPayloadMap['stop'];
        const player = this.requirePlayer(request.playerId);
        await player.stop();
        return { success: true };
      }

      case 'seek': {
        const request = payload as VideoManagerActionPayloadMap['seek'];
        const player = this.requirePlayer(request.playerId);
        await player.seek(request.time);
        return { success: true };
      }

      case 'setVolume': {
        const request = payload as VideoManagerActionPayloadMap['setVolume'];
        const player = this.requirePlayer(request.playerId);
        await player.setVolume(request.volume);
        return { success: true };
      }

      case 'setMuted': {
        const request = payload as VideoManagerActionPayloadMap['setMuted'];
        const player = this.requirePlayer(request.playerId);
        await player.setMuted(request.muted);
        return { success: true };
      }

      case 'setPlaybackRate': {
        const request = payload as VideoManagerActionPayloadMap['setPlaybackRate'];
        const player = this.requirePlayer(request.playerId);
        await player.setPlaybackRate(request.rate);
        return { success: true };
      }

      case 'setSource': {
        const request = payload as VideoManagerActionPayloadMap['setSource'];
        const player = this.requirePlayer(request.playerId);
        await player.setSource(request.source);
        return { success: true };
      }

      case 'loadSubtitles': {
        const request = payload as VideoManagerActionPayloadMap['loadSubtitles'];
        const player = this.requirePlayer(request.playerId);
        player.loadSubtitles(request.subtitles, request.defaultSubtitleId);
        return { success: true };
      }

      case 'setSubtitleTrack': {
        const request = payload as VideoManagerActionPayloadMap['setSubtitleTrack'];
        const player = this.requirePlayer(request.playerId);
        player.setSubtitleTrack(request.trackId);
        return { success: true };
      }

      case 'saveProgress': {
        const request = payload as VideoManagerActionPayloadMap['saveProgress'];
        const player = this.requirePlayer(request.playerId);
        player.saveProgress();
        return { success: true };
      }

      case 'restoreProgress': {
        const request = payload as VideoManagerActionPayloadMap['restoreProgress'];
        const player = this.requirePlayer(request.playerId);
        const restored = await player.restoreProgress();
        return { restored };
      }

      case 'getSnapshot': {
        const request = payload as VideoManagerActionPayloadMap['getSnapshot'];
        return this.getSnapshot(request.playerId);
      }

      case 'destroy': {
        const request = payload as VideoManagerActionPayloadMap['destroy'];
        const destroyed = await this.destroy(request.playerId);
        return { destroyed };
      }

      case 'destroyAll': {
        await this.destroyAll();
        return { success: true };
      }

      default: {
        return this.exhaustiveActionCheck(action);
      }
    }
  }

  private resolveAction(action: string): VideoManagerAction {
    if (action.startsWith(`${VIDEO_MANAGER_SERVICE_PREFIX}.`)) {
      return action.slice(VIDEO_MANAGER_SERVICE_PREFIX.length + 1) as VideoManagerAction;
    }

    return action as VideoManagerAction;
  }

  private requirePlayer(playerId: string): VideoPlayer {
    const player = this.players.get(playerId);

    if (!player) {
      throw new ChipsError(ErrorCodes.RESOURCE_NOT_FOUND, `Video player not found: ${playerId}`, {
        playerId,
      });
    }

    return player;
  }

  private exhaustiveActionCheck(action: never): never {
    throw new ChipsError(ErrorCodes.NOT_IMPLEMENTED, `Unsupported video action: ${String(action)}`);
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

export const videoPlayerManager = new VideoPlayerManager();

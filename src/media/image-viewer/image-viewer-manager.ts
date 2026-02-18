/**
 * ImageViewerManager
 * @module @chips/foundation/media/image-viewer/image-viewer-manager
 */

import { ChipsError, ErrorCodes } from '../../core/errors';
import type { IServiceProvider } from '../../core/interfaces';
import type { CoreRequest, CoreResponse } from '../../core/types';
import { generateId } from '../../core/utils/id-generator';
import { ImageViewer } from './image-viewer';
import type {
  ImageViewerConfig,
  ImageViewerCreateConfig,
  ImageViewerManagerAction,
  ImageViewerManagerActionPayloadMap,
  ImageViewerQRCodeFallbackDetector,
  ImageViewerSnapshot,
} from './types';

const IMAGE_MANAGER_SERVICE_PREFIX = 'media.image';

export class ImageViewerManager implements IServiceProvider {
  private readonly viewers = new Map<string, ImageViewer>();
  private readonly qrCodeFallbackDetectorRegistry = new Map<
    string,
    ImageViewerQRCodeFallbackDetector
  >();

  registerQRCodeFallbackDetector(
    detectorId: string,
    detector: ImageViewerQRCodeFallbackDetector
  ): void {
    this.qrCodeFallbackDetectorRegistry.set(detectorId, detector);
  }

  unregisterQRCodeFallbackDetector(detectorId: string): void {
    this.qrCodeFallbackDetectorRegistry.delete(detectorId);
  }

  open(config: ImageViewerCreateConfig): string {
    const viewerId = generateId();
    const container = this.resolveContainer(config.container);

    const viewerConfig: ImageViewerConfig = {
      ...config,
      container,
      qrCodeFallbackDetectors: this.resolveQRCodeFallbackDetectors(
        config.qrCodeFallbackDetectorIds
      ),
      events: {
        ...config.events,
        onClose: (snapshot) => {
          this.viewers.delete(viewerId);
          config.events?.onClose?.(snapshot);
        },
      },
    };

    const viewer = new ImageViewer(viewerConfig);
    this.viewers.set(viewerId, viewer);

    return viewerId;
  }

  get(viewerId: string): ImageViewer | undefined {
    return this.viewers.get(viewerId);
  }

  has(viewerId: string): boolean {
    return this.viewers.has(viewerId);
  }

  close(viewerId: string): boolean {
    const viewer = this.viewers.get(viewerId);
    if (!viewer) {
      return false;
    }

    viewer.close();
    this.viewers.delete(viewerId);
    return true;
  }

  closeAll(): void {
    const entries = Array.from(this.viewers.entries());
    for (const [viewerId, viewer] of entries) {
      viewer.close();
      this.viewers.delete(viewerId);
    }
  }

  getSnapshot(viewerId: string): ImageViewerSnapshot {
    return this.requireViewer(viewerId).getSnapshot();
  }

  listSnapshots(): Array<{ viewerId: string; snapshot: ImageViewerSnapshot }> {
    return Array.from(this.viewers.entries()).map(([viewerId, viewer]) => ({
      viewerId,
      snapshot: viewer.getSnapshot(),
    }));
  }

  getSupportedServices(): string[] {
    return [
      `${IMAGE_MANAGER_SERVICE_PREFIX}.open`,
      `${IMAGE_MANAGER_SERVICE_PREFIX}.close`,
      `${IMAGE_MANAGER_SERVICE_PREFIX}.closeAll`,
      `${IMAGE_MANAGER_SERVICE_PREFIX}.setSource`,
      `${IMAGE_MANAGER_SERVICE_PREFIX}.setZoom`,
      `${IMAGE_MANAGER_SERVICE_PREFIX}.zoomIn`,
      `${IMAGE_MANAGER_SERVICE_PREFIX}.zoomOut`,
      `${IMAGE_MANAGER_SERVICE_PREFIX}.rotate`,
      `${IMAGE_MANAGER_SERVICE_PREFIX}.rotateClockwise`,
      `${IMAGE_MANAGER_SERVICE_PREFIX}.rotateCounterClockwise`,
      `${IMAGE_MANAGER_SERVICE_PREFIX}.reset`,
      `${IMAGE_MANAGER_SERVICE_PREFIX}.fitToContainer`,
      `${IMAGE_MANAGER_SERVICE_PREFIX}.download`,
      `${IMAGE_MANAGER_SERVICE_PREFIX}.detectQRCodes`,
      `${IMAGE_MANAGER_SERVICE_PREFIX}.getSnapshot`,
      `${IMAGE_MANAGER_SERVICE_PREFIX}.listSnapshots`,
    ];
  }

  async handleRequest<T, R>(request: CoreRequest<T>): Promise<CoreResponse<R>> {
    const requestId = request.requestId;

    try {
      const action = this.resolveAction(request.action);
      const payload =
        request.params as ImageViewerManagerActionPayloadMap[ImageViewerManagerAction];
      const data = await this.dispatch(action, payload);

      return {
        success: true,
        data: data as R,
        requestId,
        timestamp: Date.now(),
      };
    } catch (error) {
      const wrapped = this.wrapUnknownError(error, 'Image viewer manager request failed');
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
    action: ImageViewerManagerAction,
    payload: ImageViewerManagerActionPayloadMap[ImageViewerManagerAction]
  ): Promise<unknown> {
    switch (action) {
      case 'open': {
        const request = payload as ImageViewerManagerActionPayloadMap['open'];
        const viewerId = this.open(request.config);
        return { viewerId };
      }

      case 'close': {
        const request = payload as ImageViewerManagerActionPayloadMap['close'];
        const closed = this.close(request.viewerId);
        return { closed };
      }

      case 'closeAll': {
        this.closeAll();
        return { success: true };
      }

      case 'setSource': {
        const request = payload as ImageViewerManagerActionPayloadMap['setSource'];
        this.requireViewer(request.viewerId).setSrc(request.src);
        return { success: true };
      }

      case 'setZoom': {
        const request = payload as ImageViewerManagerActionPayloadMap['setZoom'];
        this.requireViewer(request.viewerId).setZoom(request.zoom);
        return { success: true };
      }

      case 'zoomIn': {
        const request = payload as ImageViewerManagerActionPayloadMap['zoomIn'];
        this.requireViewer(request.viewerId).zoomIn(request.factor);
        return { success: true };
      }

      case 'zoomOut': {
        const request = payload as ImageViewerManagerActionPayloadMap['zoomOut'];
        this.requireViewer(request.viewerId).zoomOut(request.factor);
        return { success: true };
      }

      case 'rotate': {
        const request = payload as ImageViewerManagerActionPayloadMap['rotate'];
        this.requireViewer(request.viewerId).rotate(request.degrees);
        return { success: true };
      }

      case 'rotateClockwise': {
        const request = payload as ImageViewerManagerActionPayloadMap['rotateClockwise'];
        this.requireViewer(request.viewerId).rotateClockwise();
        return { success: true };
      }

      case 'rotateCounterClockwise': {
        const request = payload as ImageViewerManagerActionPayloadMap['rotateCounterClockwise'];
        this.requireViewer(request.viewerId).rotateCounterClockwise();
        return { success: true };
      }

      case 'reset': {
        const request = payload as ImageViewerManagerActionPayloadMap['reset'];
        this.requireViewer(request.viewerId).reset();
        return { success: true };
      }

      case 'fitToContainer': {
        const request = payload as ImageViewerManagerActionPayloadMap['fitToContainer'];
        this.requireViewer(request.viewerId).fitToContainer();
        return { success: true };
      }

      case 'download': {
        const request = payload as ImageViewerManagerActionPayloadMap['download'];
        await this.requireViewer(request.viewerId).downloadImage(request.fileName);
        return { success: true };
      }

      case 'detectQRCodes': {
        const request = payload as ImageViewerManagerActionPayloadMap['detectQRCodes'];
        const qrCodes = await this.requireViewer(request.viewerId).detectQRCodes();
        return { qrCodes };
      }

      case 'getSnapshot': {
        const request = payload as ImageViewerManagerActionPayloadMap['getSnapshot'];
        return this.getSnapshot(request.viewerId);
      }

      case 'listSnapshots': {
        return this.listSnapshots();
      }

      default: {
        return this.exhaustiveActionCheck(action);
      }
    }
  }

  private resolveAction(action: string): ImageViewerManagerAction {
    if (action.startsWith(`${IMAGE_MANAGER_SERVICE_PREFIX}.`)) {
      return action.slice(IMAGE_MANAGER_SERVICE_PREFIX.length + 1) as ImageViewerManagerAction;
    }

    return action as ImageViewerManagerAction;
  }

  private requireViewer(viewerId: string): ImageViewer {
    const viewer = this.viewers.get(viewerId);
    if (!viewer) {
      throw new ChipsError(ErrorCodes.RESOURCE_NOT_FOUND, `Image viewer not found: ${viewerId}`, {
        viewerId,
      });
    }

    return viewer;
  }

  private resolveContainer(container: HTMLElement | string | undefined): HTMLElement {
    if (!container) {
      return document.body;
    }

    if (typeof container === 'string') {
      const resolved = document.querySelector<HTMLElement>(container);
      if (!resolved) {
        throw new ChipsError(ErrorCodes.RESOURCE_NOT_FOUND, `Container not found: ${container}`, {
          container,
        });
      }

      return resolved;
    }

    return container;
  }

  private resolveQRCodeFallbackDetectors(
    detectorIds: string[] | undefined
  ): ImageViewerQRCodeFallbackDetector[] | undefined {
    if (!detectorIds || detectorIds.length === 0) {
      return undefined;
    }

    const resolved: ImageViewerQRCodeFallbackDetector[] = [];

    for (const detectorId of detectorIds) {
      const detector = this.qrCodeFallbackDetectorRegistry.get(detectorId);
      if (!detector) {
        throw new ChipsError(
          ErrorCodes.RESOURCE_NOT_FOUND,
          `QR code fallback detector not found: ${detectorId}`,
          { detectorId }
        );
      }

      resolved.push(detector);
    }

    return resolved;
  }

  private exhaustiveActionCheck(action: never): never {
    throw new ChipsError(
      ErrorCodes.NOT_IMPLEMENTED,
      `Unsupported image viewer action: ${String(action)}`
    );
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

export const imageViewerManager = new ImageViewerManager();

/**
 * ImageViewer
 * @module @chips/foundation/media/image-viewer/image-viewer
 */

import { ChipsError, ErrorCodes } from '../../core/errors';
import type {
  ImageViewerConfig,
  ImageViewerFitMode,
  ImageViewerOffset,
  ImageViewerQRCodeDetectionContext,
  ImageViewerQRCodeFallbackDetector,
  ImageViewerSnapshot,
  ImageViewerState,
} from './types';

interface BarcodeDetectionResult {
  rawValue?: string;
}

interface BarcodeDetectorLike {
  detect(image: ImageBitmapSource): Promise<BarcodeDetectionResult[]>;
}

interface BarcodeDetectorConstructorLike {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

interface PointerState {
  pointerId: number;
  x: number;
  y: number;
}

const DEFAULT_MIN_ZOOM = 0.2;
const DEFAULT_MAX_ZOOM = 8;
const DEFAULT_ZOOM_STEP = 0.15;
const DEFAULT_LONG_IMAGE_RATIO_THRESHOLD = 2;
const DEFAULT_LONG_PRESS_DELAY_MS = 550;

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'svg',
  'bmp',
  'tif',
  'tiff',
  'avif',
  'apng',
]);

const POINTER_MOVE_CANCEL_THRESHOLD = 6;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeRotation = (rotation: number): number => {
  const normalized = rotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const createError = (message: string, details?: unknown): ChipsError =>
  new ChipsError(ErrorCodes.INVALID_INPUT, message, details);

const isDataImageUrl = (src: string): boolean => /^data:image\//i.test(src);

const extractFileExtension = (src: string): string => {
  const normalized = src.split('?')[0]?.split('#')[0] ?? '';
  const segments = normalized.split('.');
  return segments.length > 1 ? segments[segments.length - 1].toLowerCase() : '';
};

const getBarcodeDetectorConstructor = (): BarcodeDetectorConstructorLike | undefined => {
  const candidate = (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector;
  if (!candidate || typeof candidate !== 'function') {
    return undefined;
  }

  return candidate as BarcodeDetectorConstructorLike;
};

const ensureSupportedFormat = (src: string): void => {
  if (isDataImageUrl(src)) {
    return;
  }

  const extension = extractFileExtension(src);
  if (!extension) {
    return;
  }

  if (!SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
    throw new ChipsError(ErrorCodes.INVALID_FORMAT, `Unsupported image format: ${extension}`, {
      extension,
      src,
    });
  }
};

const buildDownloadFileName = (src: string): string => {
  if (isDataImageUrl(src)) {
    return 'image-download.png';
  }

  const cleanPath = src.split('?')[0]?.split('#')[0] ?? src;
  const fileName = cleanPath.split('/').filter(Boolean).pop();

  if (fileName && fileName.includes('.')) {
    return fileName;
  }

  const extension = extractFileExtension(src);
  return extension ? `image-download.${extension}` : 'image-download';
};

export class ImageViewer {
  private readonly container: HTMLElement;
  private readonly rootElement: HTMLDivElement;
  private readonly stageElement: HTMLDivElement;
  private readonly imageElement: HTMLImageElement;
  private readonly closeButtonElement: HTMLButtonElement;
  private readonly events: NonNullable<ImageViewerConfig['events']>;
  private readonly className: string;

  private readonly minZoom: number;
  private readonly maxZoom: number;
  private readonly zoomStep: number;
  private readonly fitMode: ImageViewerFitMode;
  private readonly longImageRatioThreshold: number;
  private readonly longPressDelayMs: number;

  private currentSrc: string;
  private zoom: number;
  private rotation: number;
  private offset: ImageViewerOffset = { x: 0, y: 0 };
  private effectiveFitMode: Exclude<ImageViewerFitMode, 'auto'> = 'contain';
  private state: ImageViewerState = 'idle';
  private qrCodes: string[] = [];

  private pointerState: PointerState | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;
  private imageReady = false;

  constructor(private readonly config: ImageViewerConfig) {
    if (!config.src?.trim()) {
      throw createError('Image source is required');
    }

    this.container = config.container ?? document.body;
    this.className = config.className ?? '';
    this.events = config.events ?? {};
    this.currentSrc = config.src;
    this.minZoom = config.minZoom ?? DEFAULT_MIN_ZOOM;
    this.maxZoom = config.maxZoom ?? DEFAULT_MAX_ZOOM;
    this.zoomStep = config.zoomStep ?? DEFAULT_ZOOM_STEP;
    this.zoom = clamp(config.initialZoom ?? 1, this.minZoom, this.maxZoom);
    this.rotation = normalizeRotation(config.initialRotation ?? 0);
    this.fitMode = config.fitMode ?? 'auto';
    this.longImageRatioThreshold =
      config.longImageRatioThreshold ?? DEFAULT_LONG_IMAGE_RATIO_THRESHOLD;
    this.longPressDelayMs = config.longPressDelayMs ?? DEFAULT_LONG_PRESS_DELAY_MS;

    this.rootElement = document.createElement('div');
    this.stageElement = document.createElement('div');
    this.imageElement = document.createElement('img');
    this.closeButtonElement = document.createElement('button');

    this.setupDom();
    this.bindEvents();
    this.setSrc(this.currentSrc);
  }

  getZoom(): number {
    return this.zoom;
  }

  setZoom(zoom: number): void {
    this.zoom = clamp(zoom, this.minZoom, this.maxZoom);
    this.applyTransform();
    this.emitStateChange();
  }

  zoomIn(factor?: number): void {
    const stepFactor = factor ?? 1 + this.zoomStep;
    this.setZoom(this.zoom * stepFactor);
  }

  zoomOut(factor?: number): void {
    const stepFactor = factor ?? 1 + this.zoomStep;
    this.setZoom(this.zoom / stepFactor);
  }

  getRotation(): number {
    return this.rotation;
  }

  rotate(degrees: number): void {
    this.rotation = normalizeRotation(this.rotation + degrees);
    this.applyTransform();
    this.emitStateChange();
  }

  rotateClockwise(): void {
    this.rotate(90);
  }

  rotateCounterClockwise(): void {
    this.rotate(-90);
  }

  pan(dx: number, dy: number): void {
    this.offset.x += dx;
    this.offset.y += dy;
    this.applyTransform();
    this.emitStateChange();
  }

  reset(): void {
    this.zoom = clamp(this.config.initialZoom ?? 1, this.minZoom, this.maxZoom);
    this.rotation = normalizeRotation(this.config.initialRotation ?? 0);
    this.offset = { x: 0, y: 0 };
    this.applyTransform();
    this.emitStateChange();
  }

  fitToContainer(): void {
    this.offset = { x: 0, y: 0 };
    this.zoom = clamp(1, this.minZoom, this.maxZoom);
    this.applyEffectiveFitMode();
    this.applyTransform();
    this.emitStateChange();
  }

  setSrc(src: string): void {
    if (!src?.trim()) {
      throw createError('Image source is required');
    }

    ensureSupportedFormat(src);
    this.currentSrc = src;
    this.state = 'loading';
    this.imageReady = false;
    this.qrCodes = [];
    this.offset = { x: 0, y: 0 };
    this.imageElement.src = src;
    this.emitStateChange();
  }

  async downloadImage(fileName?: string): Promise<void> {
    const outputFileName =
      fileName ?? this.config.downloadFileName ?? buildDownloadFileName(this.currentSrc);
    const anchor = document.createElement('a');
    let objectUrl: string | null = null;

    try {
      anchor.download = outputFileName;
      anchor.rel = 'noopener';
      anchor.style.display = 'none';

      if (/^(blob:|data:|file:)/i.test(this.currentSrc)) {
        anchor.href = this.currentSrc;
      } else {
        try {
          const response = await fetch(this.currentSrc);
          if (response.ok) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            anchor.href = objectUrl;
          } else {
            anchor.href = this.currentSrc;
          }
        } catch {
          anchor.href = this.currentSrc;
        }
      }

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      this.events.onDownload?.({
        src: this.currentSrc,
        fileName: outputFileName,
      });
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  }

  async detectQRCodes(): Promise<string[]> {
    if (!this.imageReady || this.isDestroyed) {
      return [];
    }

    const detectionContext = this.createQRCodeDetectionContext();
    if (!detectionContext) {
      return [];
    }

    const detectorChain: ImageViewerQRCodeFallbackDetector[] = [
      (context): Promise<string[]> => this.detectByBarcodeDetector(context),
      ...this.resolveQRCodeFallbackDetectors(),
    ];
    const errors: Error[] = [];
    let detectedCodes: string[] = [];

    for (const detector of detectorChain) {
      try {
        const qrCodes = await detector(detectionContext);
        const normalized = this.normalizeQRCodeResults(qrCodes);
        if (normalized.length > 0) {
          detectedCodes = normalized;
          break;
        }
      } catch (error) {
        if (error instanceof Error) {
          errors.push(error);
        }
      }
    }

    if (detectedCodes.length > 0) {
      this.qrCodes = detectedCodes;
      this.events.onQRCodeDetected?.([...this.qrCodes]);
    } else {
      this.qrCodes = [];
    }

    if (errors.length > 0 && this.qrCodes.length === 0) {
      this.emitError(errors[errors.length - 1], 'Failed to detect QR codes');
    }

    this.emitStateChange();
    return [...this.qrCodes];
  }

  getSnapshot(): ImageViewerSnapshot {
    return {
      state: this.state,
      src: this.currentSrc,
      zoom: this.zoom,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      rotation: this.rotation,
      fitMode: this.fitMode,
      effectiveFitMode: this.effectiveFitMode,
      offset: { ...this.offset },
      qrCodes: [...this.qrCodes],
    };
  }

  close(): void {
    if (this.isDestroyed) {
      return;
    }

    const snapshot = this.getSnapshot();
    this.destroyInternal();
    this.events.onClose?.(snapshot);
  }

  destroy(): void {
    this.close();
  }

  private setupDom(): void {
    this.rootElement.className = `chips-image-viewer-overlay ${this.className}`.trim();
    this.rootElement.dataset.chipsImageViewer = 'overlay';
    this.rootElement.style.position = 'fixed';
    this.rootElement.style.inset = '0';
    this.rootElement.style.display = 'flex';
    this.rootElement.style.alignItems = 'center';
    this.rootElement.style.justifyContent = 'center';
    this.rootElement.style.background = 'rgba(10, 15, 25, 0.36)';
    this.rootElement.style.backdropFilter = 'blur(18px) saturate(145%)';
    this.rootElement.style.webkitBackdropFilter = 'blur(18px) saturate(145%)';
    this.rootElement.style.zIndex = String(this.config.overlayZIndex ?? 1200);
    this.rootElement.style.touchAction = 'none';

    this.stageElement.className = 'chips-image-viewer-stage';
    this.stageElement.style.position = 'relative';
    this.stageElement.style.width = 'min(96vw, 1600px)';
    this.stageElement.style.height = '92vh';
    this.stageElement.style.overflow = 'hidden';
    this.stageElement.style.display = 'flex';
    this.stageElement.style.alignItems = 'center';
    this.stageElement.style.justifyContent = 'center';

    this.imageElement.className = 'chips-image-viewer-image';
    this.imageElement.style.maxWidth = '100%';
    this.imageElement.style.maxHeight = '100%';
    this.imageElement.style.transformOrigin = 'center center';
    this.imageElement.style.willChange = 'transform';
    this.imageElement.style.userSelect = 'none';
    this.imageElement.style.webkitUserDrag = 'none';
    this.imageElement.style.cursor = 'grab';
    this.imageElement.draggable = false;

    this.closeButtonElement.type = 'button';
    this.closeButtonElement.className = 'chips-image-viewer-close';
    this.closeButtonElement.textContent = 'X';
    this.closeButtonElement.setAttribute(
      'aria-label',
      this.config.labels?.closeButtonAriaLabel ?? 'chips.imageViewer.close'
    );
    this.closeButtonElement.style.position = 'absolute';
    this.closeButtonElement.style.top = '20px';
    this.closeButtonElement.style.right = '24px';
    this.closeButtonElement.style.width = '36px';
    this.closeButtonElement.style.height = '36px';
    this.closeButtonElement.style.border = '1px solid rgba(255, 255, 255, 0.4)';
    this.closeButtonElement.style.borderRadius = '999px';
    this.closeButtonElement.style.background = 'rgba(22, 30, 42, 0.55)';
    this.closeButtonElement.style.color = 'rgba(255, 255, 255, 0.92)';
    this.closeButtonElement.style.cursor = 'pointer';
    this.closeButtonElement.style.fontSize = '16px';
    this.closeButtonElement.style.fontWeight = '600';

    this.stageElement.appendChild(this.imageElement);
    this.rootElement.appendChild(this.stageElement);
    this.rootElement.appendChild(this.closeButtonElement);
    this.container.appendChild(this.rootElement);
  }

  private bindEvents(): void {
    this.closeButtonElement.addEventListener('click', () => {
      this.close();
    });

    this.rootElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      void this.downloadImage();
    });

    this.rootElement.addEventListener(
      'wheel',
      (event) => {
        if (!this.config.enableWheelZoom && this.config.enableWheelZoom !== undefined) {
          return;
        }

        event.preventDefault();

        if (event.deltaY < 0) {
          this.zoomIn();
        } else {
          this.zoomOut();
        }
      },
      { passive: false }
    );

    this.rootElement.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) {
        return;
      }

      this.pointerState = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
      this.imageElement.style.cursor = 'grabbing';

      if (event.pointerType !== 'mouse') {
        this.longPressTimer = setTimeout(() => {
          this.longPressTimer = null;
          void this.downloadImage();
        }, this.longPressDelayMs);
      }

      if (typeof this.rootElement.setPointerCapture === 'function') {
        this.rootElement.setPointerCapture(event.pointerId);
      }
    });

    this.rootElement.addEventListener('pointermove', (event) => {
      if (!this.pointerState || this.pointerState.pointerId !== event.pointerId) {
        return;
      }

      const dx = event.clientX - this.pointerState.x;
      const dy = event.clientY - this.pointerState.y;

      if (
        Math.abs(dx) > POINTER_MOVE_CANCEL_THRESHOLD ||
        Math.abs(dy) > POINTER_MOVE_CANCEL_THRESHOLD
      ) {
        this.cancelLongPressTimer();
      }

      if (this.config.enableDragPan ?? true) {
        this.pan(dx, dy);
      }

      this.pointerState = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    });

    const releasePointer = (event: PointerEvent): void => {
      if (!this.pointerState || this.pointerState.pointerId !== event.pointerId) {
        return;
      }

      this.pointerState = null;
      this.imageElement.style.cursor = 'grab';
      this.cancelLongPressTimer();

      if (
        typeof this.rootElement.hasPointerCapture === 'function' &&
        this.rootElement.hasPointerCapture(event.pointerId)
      ) {
        this.rootElement.releasePointerCapture(event.pointerId);
      }
    };

    this.rootElement.addEventListener('pointerup', releasePointer);
    this.rootElement.addEventListener('pointercancel', releasePointer);

    this.imageElement.addEventListener('load', () => {
      if (this.isDestroyed) {
        return;
      }

      this.imageReady = true;
      this.state = 'ready';
      this.applyEffectiveFitMode();
      this.applyTransform();
      this.emitStateChange();

      if (this.config.enableQRCodeDetection ?? true) {
        void this.detectQRCodes();
      }
    });

    this.imageElement.addEventListener('error', () => {
      this.imageReady = false;
      this.state = 'error';
      this.emitError(new Error('Image load failed'), 'Image load failed');
      this.emitStateChange();
    });

    if (this.config.closeOnEscape ?? true) {
      window.addEventListener('keydown', this.onEscapeKeyDown);
    }

    window.addEventListener('resize', this.onWindowResize);
  }

  private onEscapeKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.close();
    }
  };

  private onWindowResize = (): void => {
    if (!this.isDestroyed) {
      this.applyTransform();
      this.emitStateChange();
    }
  };

  private cancelLongPressTimer(): void {
    if (!this.longPressTimer) {
      return;
    }

    clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
  }

  private applyEffectiveFitMode(): void {
    const imageWidth = this.imageElement.naturalWidth || this.imageElement.width;
    const imageHeight = this.imageElement.naturalHeight || this.imageElement.height;

    if (imageWidth <= 0 || imageHeight <= 0) {
      this.effectiveFitMode = 'contain';
      return;
    }

    if (this.fitMode !== 'auto') {
      this.effectiveFitMode = this.fitMode;
      return;
    }

    const ratio = imageHeight / imageWidth;
    this.effectiveFitMode = ratio >= this.longImageRatioThreshold ? 'fit-width' : 'contain';
  }

  private computeBaseScale(): number {
    const stageRect = this.stageElement.getBoundingClientRect();
    const viewportWidth = stageRect.width || window.innerWidth;
    const viewportHeight = stageRect.height || window.innerHeight;

    const rawWidth = this.imageElement.naturalWidth || this.imageElement.width || 1;
    const rawHeight = this.imageElement.naturalHeight || this.imageElement.height || 1;

    const rotatedByQuarterTurn = normalizeRotation(this.rotation) % 180 !== 0;
    const imageWidth = rotatedByQuarterTurn ? rawHeight : rawWidth;
    const imageHeight = rotatedByQuarterTurn ? rawWidth : rawHeight;

    if (this.effectiveFitMode === 'original') {
      return 1;
    }

    if (this.effectiveFitMode === 'fit-width') {
      return viewportWidth / imageWidth;
    }

    return Math.min(viewportWidth / imageWidth, viewportHeight / imageHeight);
  }

  private clampOffset(scale: number): void {
    const stageRect = this.stageElement.getBoundingClientRect();
    const viewportWidth = stageRect.width || window.innerWidth;
    const viewportHeight = stageRect.height || window.innerHeight;

    const rawWidth = this.imageElement.naturalWidth || this.imageElement.width || 1;
    const rawHeight = this.imageElement.naturalHeight || this.imageElement.height || 1;
    const rotatedByQuarterTurn = normalizeRotation(this.rotation) % 180 !== 0;
    const imageWidth = rotatedByQuarterTurn ? rawHeight : rawWidth;
    const imageHeight = rotatedByQuarterTurn ? rawWidth : rawHeight;

    const renderedWidth = imageWidth * scale;
    const renderedHeight = imageHeight * scale;

    const maxOffsetX = Math.max(0, (renderedWidth - viewportWidth) / 2);
    const maxOffsetY = Math.max(0, (renderedHeight - viewportHeight) / 2);

    this.offset.x = clamp(this.offset.x, -maxOffsetX, maxOffsetX);
    this.offset.y = clamp(this.offset.y, -maxOffsetY, maxOffsetY);
  }

  private applyTransform(): void {
    if (!this.imageReady || this.isDestroyed) {
      return;
    }

    const baseScale = this.computeBaseScale();
    const finalScale = baseScale * this.zoom;
    this.clampOffset(finalScale);

    this.imageElement.style.transform = `translate3d(${this.offset.x}px, ${this.offset.y}px, 0) rotate(${this.rotation}deg) scale(${finalScale})`;
  }

  private emitError(error: unknown, fallbackMessage: string): void {
    if (!this.events.onError) {
      return;
    }

    if (error instanceof Error) {
      this.events.onError(error);
      return;
    }

    this.events.onError(new Error(fallbackMessage));
  }

  private emitStateChange(): void {
    this.events.onStateChange?.(this.getSnapshot());
  }

  private createQRCodeDetectionContext(): ImageViewerQRCodeDetectionContext | null {
    const imageCanvas = this.createImageCanvas();
    if (!imageCanvas) {
      return null;
    }

    return {
      src: this.currentSrc,
      imageElement: this.imageElement,
      getImageCanvas: () => imageCanvas,
    };
  }

  private resolveQRCodeFallbackDetectors(): ImageViewerQRCodeFallbackDetector[] {
    return this.config.qrCodeFallbackDetectors ?? [];
  }

  private async detectByBarcodeDetector(
    context: ImageViewerQRCodeDetectionContext
  ): Promise<string[]> {
    const detectorConstructor = getBarcodeDetectorConstructor();
    if (!detectorConstructor) {
      return [];
    }

    const imageCanvas = context.getImageCanvas();
    if (!imageCanvas) {
      return [];
    }

    const detector = new detectorConstructor({ formats: ['qr_code'] });
    const detections = await detector.detect(imageCanvas);

    return detections
      .map((detection) => detection.rawValue)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
  }

  private normalizeQRCodeResults(codes: string[]): string[] {
    return Array.from(new Set(codes.filter((code) => code.length > 0)));
  }

  private createImageCanvas(): HTMLCanvasElement | null {
    const canvas = document.createElement('canvas');
    canvas.width = this.imageElement.naturalWidth || this.imageElement.width;
    canvas.height = this.imageElement.naturalHeight || this.imageElement.height;

    if (canvas.width === 0 || canvas.height === 0) {
      return null;
    }

    try {
      const context = canvas.getContext('2d');
      if (!context) {
        return null;
      }

      context.drawImage(this.imageElement, 0, 0, canvas.width, canvas.height);
      return canvas;
    } catch {
      return null;
    }
  }

  private destroyInternal(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.state = 'closed';

    this.cancelLongPressTimer();
    this.pointerState = null;

    window.removeEventListener('keydown', this.onEscapeKeyDown);
    window.removeEventListener('resize', this.onWindowResize);

    this.rootElement.remove();
  }
}

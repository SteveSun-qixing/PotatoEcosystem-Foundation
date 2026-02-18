/**
 * ImageViewer type definitions
 * @module @chips/foundation/media/image-viewer/types
 */

export type ImageViewerState = 'idle' | 'loading' | 'ready' | 'error' | 'closed';

export type ImageViewerFitMode = 'auto' | 'contain' | 'fit-width' | 'original';

export interface ImageViewerOffset {
  x: number;
  y: number;
}

export interface ImageViewerLabels {
  closeButtonAriaLabel?: string;
}

export interface ImageViewerQRCodeDetectionContext {
  src: string;
  imageElement: HTMLImageElement;
  getImageCanvas: () => HTMLCanvasElement | null;
}

export type ImageViewerQRCodeFallbackDetector = (
  context: ImageViewerQRCodeDetectionContext
) => Promise<string[]>;

export interface ImageViewerEvents {
  onClose?: (snapshot: ImageViewerSnapshot) => void;
  onError?: (error: Error) => void;
  onDownload?: (payload: { src: string; fileName: string }) => void;
  onQRCodeDetected?: (codes: string[]) => void;
  onStateChange?: (snapshot: ImageViewerSnapshot) => void;
}

export interface ImageViewerConfig {
  container?: HTMLElement;
  src: string;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  initialRotation?: number;
  fitMode?: ImageViewerFitMode;
  longImageRatioThreshold?: number;
  longPressDelayMs?: number;
  closeOnEscape?: boolean;
  enableWheelZoom?: boolean;
  enableDragPan?: boolean;
  enableQRCodeDetection?: boolean;
  qrCodeFallbackDetectors?: ImageViewerQRCodeFallbackDetector[];
  downloadFileName?: string;
  overlayZIndex?: number;
  className?: string;
  labels?: ImageViewerLabels;
  events?: ImageViewerEvents;
}

export interface ImageViewerSnapshot {
  state: ImageViewerState;
  src: string;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  rotation: number;
  fitMode: ImageViewerFitMode;
  effectiveFitMode: Exclude<ImageViewerFitMode, 'auto'>;
  offset: ImageViewerOffset;
  qrCodes: string[];
}

export interface ImageViewerCreateConfig extends Omit<ImageViewerConfig, 'container'> {
  container?: HTMLElement | string;
  qrCodeFallbackDetectorIds?: string[];
}

export interface ImageViewerManagerActionPayloadMap {
  open: {
    config: ImageViewerCreateConfig;
  };
  close: {
    viewerId: string;
  };
  closeAll: Record<string, never>;
  setSource: {
    viewerId: string;
    src: string;
  };
  setZoom: {
    viewerId: string;
    zoom: number;
  };
  zoomIn: {
    viewerId: string;
    factor?: number;
  };
  zoomOut: {
    viewerId: string;
    factor?: number;
  };
  rotate: {
    viewerId: string;
    degrees: number;
  };
  rotateClockwise: {
    viewerId: string;
  };
  rotateCounterClockwise: {
    viewerId: string;
  };
  reset: {
    viewerId: string;
  };
  fitToContainer: {
    viewerId: string;
  };
  download: {
    viewerId: string;
    fileName?: string;
  };
  detectQRCodes: {
    viewerId: string;
  };
  getSnapshot: {
    viewerId: string;
  };
  listSnapshots: Record<string, never>;
}

export type ImageViewerManagerAction = keyof ImageViewerManagerActionPayloadMap;

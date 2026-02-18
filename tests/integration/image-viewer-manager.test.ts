/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageViewerManager } from '../../src/media/image-viewer/image-viewer-manager';

function triggerImageReady(width: number, height: number): HTMLImageElement {
  const image = document.querySelector('.chips-image-viewer-image') as HTMLImageElement | null;
  if (!image) {
    throw new Error('Image element not found');
  }

  Object.defineProperty(image, 'naturalWidth', {
    configurable: true,
    value: width,
  });

  Object.defineProperty(image, 'naturalHeight', {
    configurable: true,
    value: height,
  });

  image.dispatchEvent(new Event('load'));
  return image;
}

describe('ImageViewerManager', () => {
  let manager: ImageViewerManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    manager = new ImageViewerManager();
  });

  afterEach(() => {
    manager.closeAll();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should open viewer, auto fit long image width, and support zoom/rotate/close', async () => {
    const result = await manager.dispatch('open', {
      config: {
        src: 'https://example.com/long-image.png',
        enableQRCodeDetection: false,
      },
    });

    const viewerId = (result as { viewerId: string }).viewerId;
    expect(viewerId).toHaveLength(10);

    triggerImageReady(800, 2600);

    const initialSnapshot = manager.getSnapshot(viewerId);
    expect(initialSnapshot.state).toBe('ready');
    expect(initialSnapshot.effectiveFitMode).toBe('fit-width');

    await manager.dispatch('zoomIn', { viewerId });
    await manager.dispatch('rotateClockwise', { viewerId });

    const updatedSnapshot = manager.getSnapshot(viewerId);
    expect(updatedSnapshot.zoom).toBeGreaterThan(1);
    expect(updatedSnapshot.rotation).toBe(90);

    const closed = manager.close(viewerId);
    expect(closed).toBe(true);
    expect(document.querySelector('[data-chips-image-viewer="overlay"]')).toBeNull();
  });

  it('should support context menu download, qr detect, and request handler', async () => {
    class MockBarcodeDetector {
      async detect(): Promise<Array<{ rawValue: string }>> {
        return [{ rawValue: 'chips://qrcode/demo' }];
      }
    }

    vi.stubGlobal('BarcodeDetector', MockBarcodeDetector);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const openResult = await manager.dispatch('open', {
      config: {
        src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
      },
    });

    const viewerId = (openResult as { viewerId: string }).viewerId;
    triggerImageReady(1200, 900);

    const overlay = document.querySelector('[data-chips-image-viewer="overlay"]');
    if (!overlay) {
      throw new Error('Overlay not found');
    }

    overlay.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const qrResult = await manager.dispatch('detectQRCodes', { viewerId });
    expect((qrResult as { qrCodes: string[] }).qrCodes).toEqual(['chips://qrcode/demo']);

    const response = await manager.handleRequest({
      target: 'ImageViewerManager',
      action: 'media.image.getSnapshot',
      params: { viewerId },
      requestId: 'req-image-1',
      timestamp: Date.now(),
    });

    expect(response.success).toBe(true);
    expect(response.requestId).toBe('req-image-1');
  });

  it('should use registered fallback detector when BarcodeDetector is unavailable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);

    manager.registerQRCodeFallbackDetector('mock-fallback', async (context) => {
      const canvas = context.getImageCanvas();
      if (!canvas) {
        return [];
      }

      return ['chips://qrcode/fallback'];
    });

    const openResult = await manager.dispatch('open', {
      config: {
        src: 'https://example.com/fallback.png',
        qrCodeFallbackDetectorIds: ['mock-fallback'],
      },
    });

    const viewerId = (openResult as { viewerId: string }).viewerId;
    triggerImageReady(1000, 800);

    const qrResult = await manager.dispatch('detectQRCodes', { viewerId });
    expect((qrResult as { qrCodes: string[] }).qrCodes).toEqual(['chips://qrcode/fallback']);
  });
});

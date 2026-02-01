/**
 * ImageViewer 图片查看器
 * @module @chips/foundation/media/image-viewer/image-viewer
 */

/**
 * 图片查看器配置
 */
export interface ImageViewerConfig {
  /** 容器 */
  container: HTMLElement;
  /** 图片源 */
  src: string;
  /** 初始缩放 */
  initialZoom?: number;
  /** 最小缩放 */
  minZoom?: number;
  /** 最大缩放 */
  maxZoom?: number;
}

/**
 * ImageViewer 图片查看器
 */
export class ImageViewer {
  private container: HTMLElement;
  private image: HTMLImageElement;
  private zoom: number = 1;
  private minZoom: number;
  private maxZoom: number;
  private rotation: number = 0;
  private position: { x: number; y: number } = { x: 0, y: 0 };

  constructor(config: ImageViewerConfig) {
    this.container = config.container;
    this.zoom = config.initialZoom ?? 1;
    this.minZoom = config.minZoom ?? 0.1;
    this.maxZoom = config.maxZoom ?? 10;

    this.image = document.createElement('img');
    this.image.src = config.src;
    this.image.style.transformOrigin = 'center center';
    this.container.appendChild(this.image);

    this.updateTransform();
    this.setupEvents();
  }

  /**
   * 缩放
   */
  setZoom(zoom: number): void {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    this.updateTransform();
  }

  /**
   * 放大
   */
  zoomIn(factor = 1.2): void {
    this.setZoom(this.zoom * factor);
  }

  /**
   * 缩小
   */
  zoomOut(factor = 1.2): void {
    this.setZoom(this.zoom / factor);
  }

  /**
   * 获取当前缩放
   */
  getZoom(): number {
    return this.zoom;
  }

  /**
   * 旋转
   */
  rotate(degrees: number): void {
    this.rotation = (this.rotation + degrees) % 360;
    this.updateTransform();
  }

  /**
   * 顺时针旋转90度
   */
  rotateClockwise(): void {
    this.rotate(90);
  }

  /**
   * 逆时针旋转90度
   */
  rotateCounterClockwise(): void {
    this.rotate(-90);
  }

  /**
   * 获取当前旋转角度
   */
  getRotation(): number {
    return this.rotation;
  }

  /**
   * 平移
   */
  pan(dx: number, dy: number): void {
    this.position.x += dx;
    this.position.y += dy;
    this.updateTransform();
  }

  /**
   * 重置
   */
  reset(): void {
    this.zoom = 1;
    this.rotation = 0;
    this.position = { x: 0, y: 0 };
    this.updateTransform();
  }

  /**
   * 适应容器
   */
  fitToContainer(): void {
    const containerRect = this.container.getBoundingClientRect();
    const imageWidth = this.image.naturalWidth || this.image.width;
    const imageHeight = this.image.naturalHeight || this.image.height;

    const scaleX = containerRect.width / imageWidth;
    const scaleY = containerRect.height / imageHeight;

    this.zoom = Math.min(scaleX, scaleY, 1);
    this.position = { x: 0, y: 0 };
    this.updateTransform();
  }

  /**
   * 设置图片源
   */
  setSrc(src: string): void {
    this.image.src = src;
    this.reset();
  }

  /**
   * 更新变换
   */
  private updateTransform(): void {
    this.image.style.transform = `translate(${this.position.x}px, ${this.position.y}px) scale(${this.zoom}) rotate(${this.rotation}deg)`;
  }

  /**
   * 设置事件
   */
  private setupEvents(): void {
    // 滚轮缩放
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    });

    // 拖拽平移
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    this.container.addEventListener('mousedown', (e) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) {
        return;
      }
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      this.pan(dx, dy);
      lastX = e.clientX;
      lastY = e.clientY;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.image.remove();
  }
}

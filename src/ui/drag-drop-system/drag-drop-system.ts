/**
 * DragDropSystem 拖放系统
 * @module @chips/foundation/ui/drag-drop-system/drag-drop-system
 */

/**
 * 拖放数据
 */
export interface DragData {
  /** 类型 */
  type: string;
  /** 数据 */
  data: unknown;
  /** 来源元素 */
  source?: HTMLElement;
}

/**
 * 放置目标配置
 */
export interface DropTargetConfig {
  /** 接受的类型 */
  acceptTypes: string[];
  /** 放置回调 */
  onDrop: (data: DragData, event: DragEvent) => void;
  /** 进入回调 */
  onDragEnter?: (data: DragData, event: DragEvent) => void;
  /** 离开回调 */
  onDragLeave?: (event: DragEvent) => void;
  /** 悬停回调 */
  onDragOver?: (data: DragData, event: DragEvent) => void;
}

/**
 * DragDropSystem 拖放系统
 */
export class DragDropSystem {
  private currentDrag: DragData | null = null;
  private dropTargets: Map<HTMLElement, DropTargetConfig> = new Map();

  /**
   * 设置元素为可拖拽
   */
  makeDraggable(
    element: HTMLElement,
    getData: () => DragData
  ): () => void {
    element.draggable = true;

    const handleDragStart = (e: DragEvent): void => {
      const data = getData();
      this.currentDrag = data;

      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({
          type: data.type,
          data: data.data,
        }));
      }

      element.classList.add('dragging');
    };

    const handleDragEnd = (): void => {
      this.currentDrag = null;
      element.classList.remove('dragging');
    };

    element.addEventListener('dragstart', handleDragStart);
    element.addEventListener('dragend', handleDragEnd);

    // 返回清理函数
    return () => {
      element.removeEventListener('dragstart', handleDragStart);
      element.removeEventListener('dragend', handleDragEnd);
      element.draggable = false;
    };
  }

  /**
   * 设置元素为放置目标
   */
  makeDropTarget(element: HTMLElement, config: DropTargetConfig): () => void {
    this.dropTargets.set(element, config);

    const handleDragOver = (e: DragEvent): void => {
      const data = this.getDragData(e);
      if (data && config.acceptTypes.includes(data.type)) {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        config.onDragOver?.(data, e);
      }
    };

    const handleDragEnter = (e: DragEvent): void => {
      const data = this.getDragData(e);
      if (data && config.acceptTypes.includes(data.type)) {
        e.preventDefault();
        element.classList.add('drag-over');
        config.onDragEnter?.(data, e);
      }
    };

    const handleDragLeave = (e: DragEvent): void => {
      element.classList.remove('drag-over');
      config.onDragLeave?.(e);
    };

    const handleDrop = (e: DragEvent): void => {
      e.preventDefault();
      element.classList.remove('drag-over');

      const data = this.getDragData(e);
      if (data && config.acceptTypes.includes(data.type)) {
        config.onDrop(data, e);
      }
    };

    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('dragenter', handleDragEnter);
    element.addEventListener('dragleave', handleDragLeave);
    element.addEventListener('drop', handleDrop);

    // 返回清理函数
    return () => {
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('dragenter', handleDragEnter);
      element.removeEventListener('dragleave', handleDragLeave);
      element.removeEventListener('drop', handleDrop);
      this.dropTargets.delete(element);
    };
  }

  /**
   * 获取拖放数据
   */
  private getDragData(e: DragEvent): DragData | null {
    // 优先使用当前拖放数据（同页面）
    if (this.currentDrag) {
      return this.currentDrag;
    }

    // 从 dataTransfer 解析（跨页面）
    try {
      const json = e.dataTransfer?.getData('text/plain');
      if (json) {
        const parsed = JSON.parse(json) as { type: string; data: unknown };
        return {
          type: parsed.type,
          data: parsed.data,
        };
      }
    } catch {
      // 解析失败
    }

    return null;
  }

  /**
   * 获取当前拖放数据
   */
  getCurrentDrag(): DragData | null {
    return this.currentDrag;
  }
}

/**
 * 全局拖放系统实例
 */
export const dragDropSystem = new DragDropSystem();

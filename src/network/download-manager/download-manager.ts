/**
 * DownloadManager 下载管理器
 * @module @chips/foundation/network/download-manager/download-manager
 */

import { generateId } from '../../core/utils/id-generator';
import { NetworkError } from '../../core/errors';

/**
 * 下载状态
 */
export type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';

/**
 * 下载任务
 */
export interface DownloadTask {
  /** 任务ID */
  id: string;
  /** 下载URL */
  url: string;
  /** 文件名 */
  filename?: string;
  /** 状态 */
  status: DownloadStatus;
  /** 总大小（字节） */
  totalSize: number;
  /** 已下载大小（字节） */
  downloadedSize: number;
  /** 进度（0-100） */
  progress: number;
  /** 开始时间 */
  startTime?: number;
  /** 完成时间 */
  endTime?: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 下载选项
 */
export interface DownloadOptions {
  /** 文件名 */
  filename?: string;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 进度回调 */
  onProgress?: (progress: number, downloaded: number, total: number) => void;
}

/**
 * 下载结果
 */
export interface DownloadResult {
  /** 任务信息 */
  task: DownloadTask;
  /** 数据 */
  data: Uint8Array;
}

/**
 * DownloadManager 下载管理器
 */
export class DownloadManager {
  private tasks: Map<string, DownloadTask> = new Map();
  private _maxConcurrent: number;
  private activeDownloads: number = 0;

  constructor(maxConcurrent = 3) {
    this._maxConcurrent = maxConcurrent;
  }

  /**
   * 获取最大并发数
   */
  get maxConcurrent(): number {
    return this._maxConcurrent;
  }

  /**
   * 下载文件
   */
  async download(url: string, options?: DownloadOptions): Promise<DownloadResult> {
    const taskId = generateId();

    const task: DownloadTask = {
      id: taskId,
      url,
      filename: options?.filename ?? this.extractFilename(url),
      status: 'pending',
      totalSize: 0,
      downloadedSize: 0,
      progress: 0,
    };

    this.tasks.set(taskId, task);

    try {
      task.status = 'downloading';
      task.startTime = Date.now();
      this.activeDownloads++;

      const response = await fetch(url, {
        headers: options?.headers,
      });

      if (!response.ok) {
        throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 获取内容长度
      const contentLength = response.headers.get('Content-Length');
      task.totalSize = contentLength ? parseInt(contentLength, 10) : 0;

      // 读取响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new NetworkError('Response body is not readable');
      }

      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        chunks.push(value);
        task.downloadedSize += value.length;

        if (task.totalSize > 0) {
          task.progress = Math.round((task.downloadedSize / task.totalSize) * 100);
        }

        options?.onProgress?.(task.progress, task.downloadedSize, task.totalSize);
      }

      // 合并数据
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const data = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.length;
      }

      task.status = 'completed';
      task.progress = 100;
      task.endTime = Date.now();

      return { task, data };
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.endTime = Date.now();
      throw error;
    } finally {
      this.activeDownloads--;
    }
  }

  /**
   * 取消下载
   */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    if (task.status === 'downloading') {
      task.status = 'cancelled';
      return true;
    }

    return false;
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): DownloadTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): DownloadTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 清理已完成任务
   */
  clearCompleted(): number {
    let count = 0;
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'cancelled' || task.status === 'failed') {
        this.tasks.delete(id);
        count++;
      }
    }
    return count;
  }

  /**
   * 获取活动下载数
   */
  getActiveCount(): number {
    return this.activeDownloads;
  }

  /**
   * 从 URL 提取文件名
   */
  private extractFilename(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const lastSlash = pathname.lastIndexOf('/');
      if (lastSlash !== -1 && lastSlash < pathname.length - 1) {
        return pathname.slice(lastSlash + 1);
      }
    } catch {
      // URL 解析失败
    }
    return 'download';
  }
}

/**
 * 全局下载管理器实例
 */
export const downloadManager = new DownloadManager();
